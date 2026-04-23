import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const THRESHOLD = 20;

export async function POST() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const counts = await prisma.boothScan.groupBy({
    by: ["attendeeId"],
    _count: { vendorId: true },
    having: { vendorId: { _count: { gte: THRESHOLD } } },
  });
  if (counts.length === 0) return NextResponse.json({ error: "No eligible attendees" }, { status: 400 });

  const picked = counts[Math.floor(Math.random() * counts.length)];
  const winner = await prisma.user.findUnique({
    where: { id: picked.attendeeId },
    select: { name: true, company: true, email: true },
  });
  return NextResponse.json({ winner });
}
