import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HOST_COOKIE, hostPin, isHost } from "@/lib/live-host";
import { REVEAL_GAP_MS, beltFinalistsFrom, beltStanding, getActiveGame, getOrCreateGame, getState, scoreboardFor, shuffled } from "@/lib/live-game";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "");

  // Signing in is the only thing allowed without the cookie.
  if (action === "LOGIN") {
    const pin = String(body?.pin ?? "");
    if (!hostPin()) {
      return NextResponse.json({ error: "No host PIN is set on the server yet" }, { status: 400 });
    }
    if (pin !== hostPin()) return NextResponse.json({ error: "Wrong PIN" }, { status: 401 });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(HOST_COOKIE, pin, {
      httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24,
    });
    return res;
  }

  if (!isHost()) return NextResponse.json({ error: "Host PIN required" }, { status: 401 });

  const game = await getActiveGame();
  const state = await getState(game.id);
  const set = (data: Record<string, unknown>) =>
    prisma.gameState.update({
      where: { gameId: game.id },
      // Stamp when the phase changed so the later beats can time themselves.
      data: "phase" in data ? { ...data, phaseAt: new Date() } : data,
    });

  switch (action) {
    case "SET_MODE": {
      const mode = body.mode === "LIVE" ? "LIVE" : "PRACTICE";
      await getOrCreateGame(mode);
      // Nothing else to do: getActiveGame prefers LIVE once it exists.
      return NextResponse.json({ ok: true, mode });
    }

    case "SHOW_PROMPT": {
      const promptId = String(body.promptId ?? "");
      const prompt = await prisma.gamePrompt.findUnique({ where: { id: promptId } });
      if (!prompt) return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
      await set({
        phase: "PROMPT", currentPromptId: prompt.id, revealedCount: 0,
        unmasked: false, timerEndsAt: null, timerRemaining: null,
        promptShownAt: new Date(), revealStartedAt: null,
      });
      return NextResponse.json({ ok: true });
    }

    case "START_TIMER": {
      const seconds = Number(body.seconds) || game.timerSeconds;
      await set({
        phase: "WRITING",
        timerEndsAt: new Date(Date.now() + seconds * 1000),
        timerRemaining: null,
      });
      return NextResponse.json({ ok: true });
    }

    case "PAUSE_TIMER": {
      if (!state.timerEndsAt) return NextResponse.json({ ok: true });
      const remaining = Math.max(0, Math.round((state.timerEndsAt.getTime() - Date.now()) / 1000));
      await set({ timerRemaining: remaining, timerEndsAt: null });
      return NextResponse.json({ ok: true });
    }

    case "RESUME_TIMER": {
      const remaining = state.timerRemaining ?? 0;
      await set({ timerEndsAt: new Date(Date.now() + remaining * 1000), timerRemaining: null });
      return NextResponse.json({ ok: true });
    }

    case "ADD_TIME": {
      const add = Number(body.seconds) || 30;
      if (state.timerRemaining != null) {
        await set({ timerRemaining: state.timerRemaining + add });
      } else if (state.timerEndsAt) {
        await set({ timerEndsAt: new Date(state.timerEndsAt.getTime() + add * 1000) });
      }
      return NextResponse.json({ ok: true });
    }

    case "END_TIMER":
      await set({ timerEndsAt: new Date(), timerRemaining: null });
      return NextResponse.json({ ok: true });

    case "START_REVEAL": {
      // Shuffle once, here, so the order is stable for every screen afterwards.
      if (!state.currentPromptId) return NextResponse.json({ error: "No prompt" }, { status: 400 });
      const answers = await prisma.gameAnswer.findMany({
        where: { promptId: state.currentPromptId },
      });
      const withText = answers.filter((a) => a.text.trim());
      const order = shuffled(withText);
      for (let i = 0; i < order.length; i++) {
        await prisma.gameAnswer.update({ where: { id: order[i].id }, data: { displayOrder: i } });
      }
      // Blank answers sort to the end and are never revealed.
      for (const a of answers.filter((x) => !x.text.trim())) {
        await prisma.gameAnswer.update({ where: { id: a.id }, data: { displayOrder: 999 } });
      }
      await set({
        phase: "REVEAL", revealedCount: 0, unmasked: false,
        revealStartedAt: new Date(),
      });
      return NextResponse.json({ ok: true, total: order.length });
    }

    case "REVEAL_NEXT": {
      // Impatience button. Pulls the start time back one beat so the next
      // answer lands immediately and the rest keep their rhythm.
      const startedAt = state.revealStartedAt ?? new Date();
      await set({ revealStartedAt: new Date(startedAt.getTime() - REVEAL_GAP_MS) });
      return NextResponse.json({ ok: true });
    }

    case "OPEN_VOTING":
      await set({ phase: "VOTING" });
      return NextResponse.json({ ok: true });

    case "CLOSE_VOTING":
      await set({ phase: "REVEAL" });
      return NextResponse.json({ ok: true });

    case "SHOW_RESULTS":
      await set({ phase: "RESULTS" });
      return NextResponse.json({ ok: true });

    case "UNMASK":
      // Deliberately only reachable once results are posted.
      if (state.phase !== "RESULTS") {
        return NextResponse.json({ error: "Show the results first" }, { status: 400 });
      }
      await set({ phase: "UNMASKED", unmasked: true });
      return NextResponse.json({ ok: true });

    case "PICK_WINNER": {
      // Applause fallback, and the way any tie gets settled.
      const answerId = String(body.answerId ?? "");
      const answer = await prisma.gameAnswer.findUnique({ where: { id: answerId } });
      if (!answer) return NextResponse.json({ error: "Answer not found" }, { status: 404 });
      await prisma.gameVote.deleteMany({ where: { promptId: answer.promptId } });
      await prisma.gameVote.create({
        data: { promptId: answer.promptId, answerId: answer.id, deviceId: "host-decision" },
      });
      await set({ phase: "RESULTS" });
      return NextResponse.json({ ok: true });
    }

    case "SHOW_SCOREBOARD":
      await set({ phase: "SCOREBOARD" });
      return NextResponse.json({ ok: true });

    case "START_BELT": {
      const board = await scoreboardFor(game.id);
      const finalists = beltFinalistsFrom(board);
      // Starting the Belt Match clears any previous rounds.
      await set({ phase: "BELT_INTRO", beltFinalists: finalists, beltWinners: [] });
      return NextResponse.json({ ok: true, finalists });
    }

    case "AWARD_BELT_ROUND": {
      // Whoever took the most votes on the current belt prompt wins the round.
      // An exact tie is settled with Pick Winner first, which collapses the
      // votes onto one answer, so there is nothing separate to resolve here.
      if (!state.currentPromptId) {
        return NextResponse.json({ error: "No prompt is up" }, { status: 400 });
      }
      const answers = await prisma.gameAnswer.findMany({
        where: { promptId: state.currentPromptId },
        select: { id: true, playerId: true, _count: { select: { votes: true } } },
      });
      const contenders = answers.filter((a) => state.beltFinalists.includes(a.playerId));
      if (!contenders.length) {
        return NextResponse.json({ error: "Neither finalist answered this one" }, { status: 400 });
      }
      const best = [...contenders].sort((a, b) => b._count.votes - a._count.votes);
      if (best.length > 1 && best[0]._count.votes === best[1]._count.votes) {
        return NextResponse.json(
          { error: "That round is tied. Use Pick the winner by applause, then award it." },
          { status: 400 }
        );
      }
      const winners = [...state.beltWinners, best[0].playerId];
      await set({ beltWinners: winners });
      await prisma.gamePrompt.update({
        where: { id: state.currentPromptId }, data: { used: true },
      });
      const players = await prisma.gamePlayer.findMany({
        where: { id: { in: state.beltFinalists } }, select: { id: true, name: true },
      });
      return NextResponse.json({ ok: true, standing: beltStanding(players, winners) });
    }

    case "UNDO_BELT_ROUND": {
      await set({ beltWinners: state.beltWinners.slice(0, -1) });
      return NextResponse.json({ ok: true });
    }

    case "CROWN": {
      await set({ phase: "CHAMPION", championId: String(body.playerId ?? "") || null });
      return NextResponse.json({ ok: true });
    }

    case "LOBBY":
      await set({ phase: "LOBBY", currentPromptId: null, revealedCount: 0, unmasked: false });
      return NextResponse.json({ ok: true });

    case "TYPE_FOR_PLAYER": {
      // Someone's phone died; they wrote on a card and it gets typed in here.
      const playerId = String(body.playerId ?? "");
      const text = String(body.text ?? "").slice(0, game.answerMaxLength);
      if (!state.currentPromptId) return NextResponse.json({ error: "No prompt" }, { status: 400 });
      await prisma.gameAnswer.upsert({
        where: { promptId_playerId: { promptId: state.currentPromptId, playerId } },
        create: { promptId: state.currentPromptId, playerId, text, typedByHost: true },
        update: { text, typedByHost: true },
      });
      return NextResponse.json({ ok: true });
    }

    case "UNLOCK_PLAYER": {
      await prisma.gamePlayer.update({
        where: { id: String(body.playerId ?? "") },
        data: { deviceId: null },
      });
      return NextResponse.json({ ok: true });
    }

    case "MUTE":
      await prisma.game.update({
        where: { id: game.id },
        data: { hostMuted: !!body.muted },
      });
      return NextResponse.json({ ok: true });

    case "RESET_GAME": {
      // Answers, votes and progress go; players and prompts stay.
      const prompts = await prisma.gamePrompt.findMany({
        where: { gameId: game.id }, select: { id: true },
      });
      const ids = prompts.map((p) => p.id);
      await prisma.gameVote.deleteMany({ where: { promptId: { in: ids } } });
      await prisma.gameAnswer.deleteMany({ where: { promptId: { in: ids } } });
      await prisma.gamePrompt.updateMany({ where: { gameId: game.id }, data: { used: false } });
      await set({
        phase: "LOBBY", currentPromptId: null, revealedCount: 0, unmasked: false,
        timerEndsAt: null, timerRemaining: null, beltFinalists: [], championId: null,
      });
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}
