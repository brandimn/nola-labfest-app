import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveGame, getState } from "@/lib/live-game";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const deviceId = String(body?.deviceId ?? "").slice(0, 64);
  if (!deviceId) return NextResponse.json({ error: "Missing device" }, { status: 400 });

  const game = await getActiveGame();

  // Claim a seat. One phone per finalist; the host can unlock a slot.
  if (body.action === "CLAIM") {
    const playerId = String(body.playerId ?? "");
    const player = await prisma.gamePlayer.findUnique({ where: { id: playerId } });
    if (!player || player.gameId !== game.id) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
    if (player.deviceId && player.deviceId !== deviceId) {
      return NextResponse.json(
        { error: "Someone already picked that name. Ask the host to unlock it." },
        { status: 409 }
      );
    }
    // Release any other seat this phone was holding.
    await prisma.gamePlayer.updateMany({
      where: { gameId: game.id, deviceId },
      data: { deviceId: null },
    });
    await prisma.gamePlayer.update({ where: { id: playerId }, data: { deviceId } });
    return NextResponse.json({ ok: true, playerId });
  }

  if (body.action === "ANSWER") {
    const state = await getState(game.id);
    if (!state.currentPromptId) {
      return NextResponse.json({ error: "Nothing to answer yet" }, { status: 400 });
    }
    // Writing only. Once the timer is done the answer is locked.
    if (state.phase !== "WRITING") {
      return NextResponse.json({ error: "Answers are closed" }, { status: 400 });
    }
    if (state.timerEndsAt && state.timerEndsAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Time is up" }, { status: 400 });
    }
    const player = await prisma.gamePlayer.findFirst({ where: { gameId: game.id, deviceId } });
    if (!player) return NextResponse.json({ error: "Pick your name first" }, { status: 403 });

    // In the Belt Match only the finalists are still writing.
    const prompt = await prisma.gamePrompt.findUnique({
      where: { id: state.currentPromptId },
      select: { round: true },
    });
    if (prompt?.round === "BELT" && !state.beltFinalists.includes(player.id)) {
      return NextResponse.json({ error: "This one is for the finalists" }, { status: 403 });
    }

    const text = String(body.text ?? "").trim().slice(0, game.answerMaxLength);
    await prisma.gameAnswer.upsert({
      where: { promptId_playerId: { promptId: state.currentPromptId, playerId: player.id } },
      create: { promptId: state.currentPromptId, playerId: player.id, text },
      update: { text },
    });

    // Once everyone who is still in has answered, stop the clock. Waiting for
    // the operator to notice and tap End now is the choppiest part of the show.
    const eligible =
      prompt?.round === "BELT"
        ? state.beltFinalists
        : (await prisma.gamePlayer.findMany({
            where: { gameId: game.id }, select: { id: true },
          })).map((p) => p.id);

    if (eligible.length) {
      const answered = await prisma.gameAnswer.findMany({
        where: { promptId: state.currentPromptId, playerId: { in: eligible } },
        select: { text: true },
      });
      const done = answered.filter((a) => a.text.trim()).length;
      if (done >= eligible.length && state.timerEndsAt && state.timerEndsAt.getTime() > Date.now()) {
        await prisma.gameState.update({
          where: { gameId: game.id },
          data: { timerEndsAt: new Date(), timerRemaining: null },
        });
      }
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// What this phone is: which seat it holds and what it already submitted.
export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("deviceId") ?? "";
  const game = await getActiveGame();
  const state = await getState(game.id);

  const player = deviceId
    ? await prisma.gamePlayer.findFirst({ where: { gameId: game.id, deviceId } })
    : null;

  const mine = player && state.currentPromptId
    ? await prisma.gameAnswer.findUnique({
        where: { promptId_playerId: { promptId: state.currentPromptId, playerId: player.id } },
        select: { text: true },
      })
    : null;

  return NextResponse.json(
    {
      player: player ? { id: player.id, name: player.name } : null,
      myAnswer: mine?.text ?? "",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
