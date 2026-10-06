import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isHost } from "@/lib/live-host";
import { getActiveGame, getState } from "@/lib/live-game";

// Live vote counts, for the operator only. Deliberately not part of the shared
// state, so the big screen can never leak them while voting is open.
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isHost()) return NextResponse.json({ error: "Host PIN required" }, { status: 401 });
  const game = await getActiveGame();
  const state = await getState(game.id);
  if (!state.currentPromptId) return NextResponse.json({ total: 0, byAnswer: {} });

  const votes = await prisma.gameVote.groupBy({
    by: ["answerId"],
    where: { promptId: state.currentPromptId },
    _count: { _all: true },
  });
  const byAnswer: Record<string, number> = {};
  let total = 0;
  for (const v of votes) {
    byAnswer[v.answerId] = v._count._all;
    total += v._count._all;
  }
  return NextResponse.json({ total, byAnswer }, { headers: { "Cache-Control": "no-store" } });
}
