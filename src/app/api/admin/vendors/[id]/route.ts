import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeCategories } from "../route";

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s?.user || s.user.role !== "ADMIN") return null;
  return s.user;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const hasCats = "categories" in body || "category" in body;
  const categories = normalizeCategories(body.categories ?? body.category);
  const v = await prisma.vendor.update({
    where: { id: params.id },
    data: {
      name: body.name?.trim(),
      boothNumber: body.boothNumber?.trim(),
      ...(hasCats ? { categories, category: categories[0] ?? null } : {}),
      logoUrl: body.logoUrl || null,
      website: body.website || null,
      contactEmail: body.contactEmail || null,
      contactPhone: body.contactPhone || null,
      description: body.description || null,
      sponsorTier: body.sponsorTier || null,
      atLabFest: body.atLabFest !== false,
      isLunchSponsor: body.isLunchSponsor === true,
    },
  });
  return NextResponse.json(v);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.vendor.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
