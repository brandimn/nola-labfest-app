import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ATTRIBUTED_PHASES, beltStanding, getActiveGame, getState, scoreboardFor, Phase } from "@/lib/live-game";

// Every screen polls this. Hundreds of phones at once, so it stays small and is
// cached for a second at the edge. The host passes ?fresh=1 to skip the cache so
// his own taps feel instant.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const fresh = req.nextUrl.searchParams.get("fresh") === "1";

  const game = await getActiveGame();
  const state = await getState(game.id);
  const phase = state.phase as Phase;
  const attributed = ATTRIBUTED_PHASES.includes(phase);

  const players = await prisma.gamePlayer.findMany({
    where: { gameId: game.id },
    orderBy: { seatOrder: "asc" },
    select: { id: true, name: true, seatOrder: true, deviceId: true },
  });

  const prompt = state.currentPromptId
    ? await prisma.gamePrompt.findUnique({
        where: { id: state.currentPromptId },
        select: { id: true, round: true, text: true, imageUrl: true, isFinale: true },
      })
    : null;

  // Who has answered, for the writing screen. Counts only, never the text.
  const answers = prompt
    ? await prisma.gameAnswer.findMany({
        where: { promptId: prompt.id },
        orderBy: { displayOrder: "asc" },
        select: {
          id: true, text: true, playerId: true, displayOrder: true,
          _count: { select: { votes: true } },
        },
      })
    : [];

  const answeredPlayerIds = answers.filter((a) => a.text.trim()).map((a) => a.playerId);
  const showAnswers = ["REVEAL", "VOTING", "RESULTS", "UNMASKED"].includes(phase);
  const showCounts = ["RESULTS", "UNMASKED"].includes(phase);
  const totalVotes = answers.reduce((n, a) => n + a._count.votes, 0);

  const body = {
    serverTime: Date.now(),
    game: {
      name: game.name,
      beltText: game.beltText,
      mode: game.mode,
      timerSeconds: game.timerSeconds,
      answerMaxLength: game.answerMaxLength,
      muted: game.hostMuted,
    },
    phase,
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      claimed: !!p.deviceId,
      answered: answeredPlayerIds.includes(p.id),
    })),
    prompt: prompt
      ? {
          id: prompt.id,
          round: prompt.round,
          text: prompt.text,
          // A data URL here would be re-sent to every phone on every poll, so
          // only a pointer travels and the picture is fetched once.
          photo: prompt.imageUrl ? `/api/live/photo/${prompt.id}` : null,
          isFinale: prompt.isFinale,
        }
      : null,
    timer: {
      endsAt: state.timerEndsAt ? state.timerEndsAt.getTime() : null,
      remaining: state.timerRemaining,
      paused: state.timerRemaining != null,
    },
    revealedCount: state.revealedCount,
    unmasked: state.unmasked,
    answers: showAnswers
      ? answers
          .slice(0, phase === "REVEAL" ? state.revealedCount : answers.length)
          .map((a) => ({
            id: a.id,
            text: a.text,
            votes: showCounts ? a._count.votes : null,
            percent: showCounts && totalVotes ? Math.round((a._count.votes / totalVotes) * 100) : null,
            // Absent entirely until the unmask.
            player: attributed ? players.find((p) => p.id === a.playerId)?.name ?? null : null,
          }))
      : [],
    answerCount: answers.filter((a) => a.text.trim()).length,
    beltFinalists: state.beltFinalists,
    belt: state.beltFinalists.length
      ? beltStanding(
          players
            .filter((p) => state.beltFinalists.includes(p.id))
            .map((p) => ({ id: p.id, name: p.name })),
          state.beltWinners
        )
      : null,
    championId: state.championId,
    scoreboard: ["SCOREBOARD", "BELT_INTRO", "CHAMPION"].includes(phase)
      ? await scoreboardFor(game.id)
      : null,
  };

  return NextResponse.json(body, {
    headers: fresh
      ? { "Cache-Control": "no-store" }
      : { "Cache-Control": "public, s-maxage=1, stale-while-revalidate=2" },
  });
}
