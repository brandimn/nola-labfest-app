import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HOST_COOKIE, hostPin, isHost } from "@/lib/live-host";
import { REVEAL_GAP_MS, beltStanding, finalistsFrom, getActiveGame, getOrCreateGame, getState, scoreboardFor, shuffled } from "@/lib/live-game";
import { byPlayingOrder } from "@/lib/live-rounds";

export const dynamic = "force-dynamic";

/** Both routes into the Belt Match go through here, so the one button and the
 *  explicit button cannot disagree about who is playing. */
async function finalistsFor(gameId: string, picked: string[]) {
  return finalistsFrom(await scoreboardFor(gameId), picked);
}

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
      data:
        "phase" in data
          ? { autoPaused: false, ...data, phaseAt: new Date() }
          : data,
    });

  switch (action) {
    case "SET_MODE": {
      const mode = body.mode === "LIVE" ? "LIVE" : "PRACTICE";
      await getOrCreateGame(mode);
      // Nothing else to do: getActiveGame prefers LIVE once it exists.
      return NextResponse.json({ ok: true, mode });
    }

    // The single button. Works out what comes next and does it, so nobody has
    // to know which control applies right now.
    case "NEXT": {
      const phase = state.phase;

      if (phase === "CHAMPION") {
        await set({ phase: "LOBBY", currentPromptId: null, revealedCount: 0, unmasked: false });
        return NextResponse.json({ ok: true, did: "Lobby" });
      }

      if (phase === "PROMPT") {
        await set({
          phase: "WRITING",
          timerEndsAt: new Date(Date.now() + game.timerSeconds * 1000),
          timerRemaining: null,
        });
        return NextResponse.json({ ok: true, did: "Writing is open" });
      }
      if (phase === "WRITING") {
        await set({ timerEndsAt: new Date(), timerRemaining: null });
        return NextResponse.json({ ok: true, did: "Time called" });
      }
      if (phase === "REVEAL") {
        await set({ phase: "VOTING" });
        return NextResponse.json({ ok: true, did: "Voting is open" });
      }
      if (phase === "VOTING") {
        await set({ phase: "RESULTS" });
        return NextResponse.json({ ok: true, did: "Results are up" });
      }
      if (phase === "RESULTS") {
        await set({ phase: "UNMASKED", unmasked: true });
        return NextResponse.json({ ok: true, did: "Names revealed" });
      }
      if (phase === "UNMASKED") {
        // Mark the prompt played here, so Next can always find the right one.
        if (state.currentPromptId) {
          await prisma.gamePrompt.updateMany({
            where: { id: state.currentPromptId }, data: { used: true },
          });
        }
        await set({ phase: "SCOREBOARD" });
        return NextResponse.json({ ok: true, did: "Scoreboard" });
      }

      // Lobby, a scoreboard, or the Belt Match intro: on to the next prompt.
      const rounds = state.beltFinalists.length ? ["BELT"] : ["R1", "R2"];
      // Sorted in code, not in the query. Ordering on the round string is
      // alphabetical, which only gives R1 before R2 by luck and would put BELT
      // first the moment these sets ever overlap. See src/lib/live-rounds.ts.
      const candidates = await prisma.gamePrompt.findMany({
        where: { gameId: game.id, used: false, round: { in: rounds } },
      });
      const next = candidates.sort(byPlayingOrder)[0] ?? null;

      if (next) {
        await set({
          phase: "PROMPT", currentPromptId: next.id, revealedCount: 0, unmasked: false,
          timerEndsAt: null, timerRemaining: null,
          promptShownAt: new Date(), revealStartedAt: null,
        });
        return NextResponse.json({ ok: true, did: "Next prompt" });
      }

      // Rounds are done and the Belt Match has not started: start it. Honours
      // a hand picked pair, so the one button does the same thing as the
      // Start Belt Match button.
      if (!state.beltFinalists.length) {
        const finalists = await finalistsFor(game.id, state.beltPicked);
        await set({ phase: "BELT_INTRO", beltFinalists: finalists, beltWinners: [] });
        return NextResponse.json({ ok: true, did: "Belt Match" });
      }

      // Belt prompts are done too. Crowning stays a deliberate choice.
      return NextResponse.json(
        { error: "That is every prompt. Crown the champion below." },
        { status: 400 }
      );
    }

    // Jump straight to a screen to look at it, without playing a game.
    case "PREVIEW": {
      const want = String(body.phase ?? "LOBBY");
      const players = await prisma.gamePlayer.findMany({
        where: { gameId: game.id }, orderBy: { seatOrder: "asc" },
      });
      const prompt =
        (state.currentPromptId
          ? await prisma.gamePrompt.findUnique({ where: { id: state.currentPromptId } })
          : null) ??
        // The preview samples the first prompt of the show, so it has to be the
        // first by playing order, not the alphabetically first round.
        (await prisma.gamePrompt
          .findMany({ where: { gameId: game.id } })
          .then((all) => all.sort(byPlayingOrder)[0] ?? null));

      const data: Record<string, unknown> = {
        phase: want,
        autoPaused: true,
        phaseAt: new Date(),
        currentPromptId: prompt?.id ?? null,
      };

      // Give each screen enough to look like itself.
      if (want === "WRITING") {
        data.timerEndsAt = new Date(Date.now() + 60_000);
        data.timerRemaining = null;
      }
      if (want === "REVEAL") {
        data.revealStartedAt = new Date(Date.now() - 60_000); // all answers already up
        data.revealedCount = 99;
      }
      if (["UNMASKED", "SCOREBOARD", "CHAMPION"].includes(want)) data.unmasked = true;
      if (["BELT_INTRO", "CHAMPION"].includes(want)) {
        data.beltFinalists = players.slice(0, 2).map((p) => p.id);
      }
      if (want === "CHAMPION") data.championId = players[0]?.id ?? null;
      if (want === "LOBBY") {
        data.currentPromptId = null;
        data.unmasked = false;
      }

      await prisma.gameState.update({ where: { gameId: game.id }, data });
      return NextResponse.json({ ok: true, previewing: want });
    }

    case "RESUME_GAME": {
      await prisma.gameState.update({
        where: { gameId: game.id },
        data: { autoPaused: false },
      });
      return NextResponse.json({ ok: true });
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

    // Choose the finalists by hand from the scoreboard. Does not start the
    // Belt Match, so the host can look at the board, adjust, and still read the
    // room before committing.
    case "SET_FINALISTS": {
      const ids = Array.isArray(body.playerIds) ? body.playerIds.map(String) : [];
      const unique = Array.from(new Set<string>(ids));
      if (unique.length < 2 || unique.length > 3) {
        return NextResponse.json(
          { error: "Pick two finalists, or three if you are honouring a tie" },
          { status: 400 }
        );
      }
      const real = await prisma.gamePlayer.findMany({
        where: { gameId: game.id, id: { in: unique } },
        select: { id: true },
      });
      if (real.length !== unique.length) {
        return NextResponse.json({ error: "One of those players is not in this game" }, { status: 400 });
      }
      await set({ beltPicked: unique });
      return NextResponse.json({ ok: true, picked: unique });
    }

    // Back to whatever the scores say.
    case "CLEAR_FINALISTS":
      await set({ beltPicked: [] });
      return NextResponse.json({ ok: true });

    case "START_BELT": {
      const finalists = await finalistsFor(game.id, state.beltPicked);
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
        timerEndsAt: null, timerRemaining: null, beltFinalists: [], beltPicked: [],
        beltWinners: [], championId: null,
      });
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}
