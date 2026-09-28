import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveThreshold, DRAWING_WINNERS } from "@/lib/drawing";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [total, override] = await Promise.all([
    prisma.vendor.count(),
    prisma.setting.findUnique({ where: { key: "drawingThreshold" } }),
  ]);
  const threshold = resolveThreshold(total, override?.value);

  const counts = await prisma.boothScan.groupBy({
    by: ["attendeeId"],
    _count: { vendorId: true },
    having: { vendorId: { _count: { gte: threshold } } },
  });
  if (counts.length === 0) {
    return NextResponse.json({ error: "No eligible attendees yet" }, { status: 400 });
  }

  // Fisher-Yates shuffle, then take up to DRAWING_WINNERS distinct winners.
  const ids = counts.map((c) => c.attendeeId);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const pickedIds = ids.slice(0, DRAWING_WINNERS);

  const users = await prisma.user.findMany({
    where: { id: { in: pickedIds } },
    select: { id: true, name: true, company: true, email: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  const winners = pickedIds
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((u) => ({ name: u!.name, company: u!.company, email: u!.email }));

  return NextResponse.json({ winners });
}
