import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { normalizeCategories } from "../route";

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s?.user || s.user.role !== "ADMIN") return null;
  return s.user;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Partial update — only touch fields that were actually sent, so an edit
  // never silently wipes existing data.
  const data: Prisma.VendorUpdateInput = {};
  if (typeof body.name === "string") data.name = body.name.trim();
  if (typeof body.boothNumber === "string") data.boothNumber = body.boothNumber.trim();
  if ("categories" in body || "category" in body) {
    const cats = normalizeCategories(body.categories ?? body.category);
    data.categories = cats;
    data.category = cats[0] ?? null;
  }
  for (const f of ["logoUrl", "website", "contactEmail", "contactPhone", "description", "sponsorTier"] as const) {
    if (f in body) data[f] = body[f] || null;
  }
  if ("sponsorships" in body) {
    data.sponsorships = Array.isArray(body.sponsorships)
      ? body.sponsorships.map((x: unknown) => String(x).trim()).filter(Boolean)
      : [];
  }
  if ("atLabFest" in body) data.atLabFest = body.atLabFest !== false;
  if ("isLunchSponsor" in body) data.isLunchSponsor = body.isLunchSponsor === true;
  if ("atLOTM" in body) data.atLOTM = body.atLOTM === true;

  try {
    const v = await prisma.vendor.update({ where: { id: params.id }, data });
    return NextResponse.json(v);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    await prisma.vendor.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }
    throw e;
  }
}
