import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s?.user || s.user.role !== "ADMIN") return null;
  return s.user;
}

/** Accept a categories array or a comma-separated string; return a clean string[]. */
export function normalizeCategories(input: unknown): string[] {
  const arr = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(",")
      : [];
  return Array.from(new Set(arr.map((c) => String(c).trim()).filter(Boolean)));
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.boothNumber) {
    return NextResponse.json({ error: "Name and booth number required" }, { status: 400 });
  }
  const categories = normalizeCategories(body.categories ?? body.category);
  const v = await prisma.vendor.create({
    data: {
      name: body.name.trim(),
      boothNumber: body.boothNumber.trim(),
      categories,
      category: categories[0] ?? null,
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
