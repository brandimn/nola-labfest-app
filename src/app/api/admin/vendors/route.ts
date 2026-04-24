import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s?.user || s.user.role !== "ADMIN") return null;
  return s.user;
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  if (!body?.name || !body?.boothNumber) {
    return NextResponse.json({ error: "Name and booth number required" }, { status: 400 });
  }
  const v = await prisma.vendor.create({
    data: {
      name: body.name.trim(),
      boothNumber: body.boothNumber.trim(),
      category: body.category || null,
      logoUrl: body.logoUrl || null,
      website: body.website || null,
      contactEmail: body.contactEmail || null,
      contactPhone: body.contactPhone || null,
      description: body.description || null,
      sponsorTier: body.sponsorTier || null,
      atLabFest: body.atLabFest !== false,
      atLOTM: body.atLOTM === true,
      isLunchSponsor: body.isLunchSponsor === true,
    },
  });
  return NextResponse.json(v);
}
