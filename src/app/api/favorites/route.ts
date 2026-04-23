import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  const existing = await prisma.favorite.findUnique({
    where: { userId_sessionId: { userId: session.user.id, sessionId: body.sessionId } },
  });
  if (existing) {
    await prisma.favorite.delete({
      where: { userId_sessionId: { userId: session.user.id, sessionId: body.sessionId } },
    });
    return NextResponse.json({ favorited: false });
  }
  await prisma.favorite.create({
    data: { userId: session.user.id, sessionId: body.sessionId },
  });
  return NextResponse.json({ favorited: true });
}
