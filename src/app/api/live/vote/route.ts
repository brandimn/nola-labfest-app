import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveGame, getState } from "@/lib/live-game";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const deviceId = String(body?.deviceId ?? "").slice(0, 64);
  const answerId = String(body?.answerId ?? "");
  if (!deviceId || !answerId) {
    return NextResponse.json({ error: "Missing vote" }, { status: 400 });
  }

  const game = await getActiveGame();
  const state = await getState(game.id);
  if (state.phase !== "VOTING" || !state.currentPromptId) {
    return NextResponse.json({ error: "Voting is closed" }, { status: 400 });
  }

  const answer = await prisma.gameAnswer.findUnique({ where: { id: answerId } });
  if (!answer || answer.promptId !== state.currentPromptId) {
    return NextResponse.json({ error: "That answer is not up for a vote" }, { status: 400 });
  }

  try {
    await prisma.gameVote.create({
      data: { promptId: state.currentPromptId, answerId, deviceId },
    });
  } catch (e) {
    // One vote per phone per prompt, enforced by the database rather than trust.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ ok: true, alreadyVoted: true });
    }
    throw e;
  }
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("deviceId") ?? "";
  const game = await getActiveGame();
  const state = await getState(game.id);
  if (!deviceId || !state.currentPromptId) return NextResponse.json({ voted: false });

  const vote = await prisma.gameVote.findUnique({
    where: { promptId_deviceId: { promptId: state.currentPromptId, deviceId } },
    select: { answerId: true },
  });
  return NextResponse.json(
    { voted: !!vote, answerId: vote?.answerId ?? null },
    { headers: { "Cache-Control": "no-store" } }
  );
}
