import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  if (session.user.role !== "ATTENDEE") {
    return NextResponse.json({ error: "Only attendees can vote" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const vendorId = body?.vendorId?.toString().trim();
  if (!vendorId) return NextResponse.json({ error: "Missing vendor" }, { status: 400 });

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const vote = await prisma.boothVote.upsert({
    where: { attendeeId: session.user.id },
    create: { attendeeId: session.user.id, vendorId: vendor.id },
    update: { vendorId: vendor.id, votedAt: new Date() },
  });

  return NextResponse.json({ ok: true, vendorId: vote.vendorId, vendorName: vendor.name });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  if (session.user.role !== "ATTENDEE") {
    return NextResponse.json({ error: "Only attendees can vote" }, { status: 403 });
  }
  await prisma.boothVote.deleteMany({ where: { attendeeId: session.user.id } });
  return NextResponse.json({ ok: true });
}
