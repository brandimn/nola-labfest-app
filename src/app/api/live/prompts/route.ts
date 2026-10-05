import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveGame } from "@/lib/live-game";

export const dynamic = "force-dynamic";

export async function GET() {
  const game = await getActiveGame();
  const prompts = await prisma.gamePrompt.findMany({
    where: { gameId: game.id },
    orderBy: [{ round: "asc" }, { sortOrder: "asc" }],
    select: { id: true, round: true, text: true, sortOrder: true, used: true, isFinale: true },
  });
  return NextResponse.json(prompts, { headers: { "Cache-Control": "no-store" } });
}
