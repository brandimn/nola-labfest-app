import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  if (session.user.role !== "ATTENDEE") {
    return NextResponse.json({ error: "Only attendees earn stamps" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const token = body?.token?.toString().trim();
  if (!token) return NextResponse.json({ error: "Missing QR token" }, { status: 400 });

  const vendor = await prisma.vendor.findUnique({ where: { boothToken: token } });
  if (!vendor) return NextResponse.json({ error: "Invalid booth code" }, { status: 404 });

  const existing = await prisma.boothScan.findUnique({
    where: { attendeeId_vendorId: { attendeeId: session.user.id, vendorId: vendor.id } },
  });
  if (existing) {
    return NextResponse.json({ vendorName: vendor.name, alreadyScanned: true });
  }
  await prisma.boothScan.create({
    data: { attendeeId: session.user.id, vendorId: vendor.id },
  });
  return NextResponse.json({ vendorName: vendor.name, alreadyScanned: false });
}
