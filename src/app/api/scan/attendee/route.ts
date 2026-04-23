import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  if (session.user.role !== "VENDOR" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only vendors can capture leads" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const token = body?.token?.toString().trim();
  if (!token) return NextResponse.json({ error: "Missing badge token" }, { status: 400 });

  const attendee = await prisma.user.findUnique({ where: { badgeToken: token } });
  if (!attendee) return NextResponse.json({ error: "Invalid badge" }, { status: 404 });

  const vendor = await prisma.vendor.findUnique({ where: { userId: session.user.id } });
  if (!vendor) {
    return NextResponse.json({ error: "No vendor profile found for your account" }, { status: 400 });
  }

  const existing = await prisma.lead.findUnique({
    where: { vendorId_attendeeId: { vendorId: vendor.id, attendeeId: attendee.id } },
  });
  const alreadyCaptured = !!existing;
  if (!existing) {
    await prisma.lead.create({
      data: { vendorId: vendor.id, attendeeId: attendee.id },
    });
  }
  return NextResponse.json({
    alreadyCaptured,
    attendee: {
      name: attendee.name,
      email: attendee.email,
      company: attendee.company,
      title: attendee.title,
      phone: attendee.phone,
    },
  });
}
