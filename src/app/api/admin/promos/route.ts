import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s?.user || s.user.role !== "ADMIN") return null;
  return s.user;
}

// Admin adds a promo on any vendor's behalf (e.g. the deals we already have).
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const vendorId = typeof body?.vendorId === "string" ? body.vendorId : "";
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!vendorId) return NextResponse.json({ error: "Pick a vendor" }, { status: 400 });
  if (!title) return NextResponse.json({ error: "Please give the promo a short title" }, { status: 400 });

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } });
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const promo = await prisma.promo.create({
    data: {
      vendorId,
      title,
      details: typeof body.details === "string" ? body.details.trim() || null : null,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl.trim() || null : null,
      window: typeof body.window === "string" ? body.window.trim() || null : null,
      active: body.active !== false,
      createdById: admin.id,
    },
  });
  return NextResponse.json(promo);
}
