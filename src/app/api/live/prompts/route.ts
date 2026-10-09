import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveGame } from "@/lib/live-game";
import { byPlayingOrder } from "@/lib/live-rounds";

export const dynamic = "force-dynamic";

export async function GET() {
  const game = await getActiveGame();
  const prompts = await prisma.gamePrompt.findMany({
    where: { gameId: game.id },
    select: { id: true, round: true, text: true, sortOrder: true, used: true, isFinale: true, isTiebreak: true },
  });
  // Sorted here rather than in the query, because ordering on the round string
  // is alphabetical and puts BELT first. See src/lib/live-rounds.ts.
  prompts.sort(byPlayingOrder);
  return NextResponse.json(prompts, { headers: { "Cache-Control": "no-store" } });
}
