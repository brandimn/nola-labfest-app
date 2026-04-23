import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, installedAt: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.installedAt) return NextResponse.json({ ok: true, alreadyRecorded: true });

  await prisma.user.update({
    where: { id: user.id },
    data: { installedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
