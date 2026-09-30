import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMyBooth } from "@/lib/booth";
import { Prisma } from "@prisma/client";

// Confirms the signed-in user's booth owns this promo before touching it.
async function ownedPromo(userId: string, promoId: string) {
  const booth = await getMyBooth(userId);
  if (!booth) return null;
  const promo = await prisma.promo.findUnique({ where: { id: promoId } });
  if (!promo || promo.vendorId !== booth.id) return null;
  return promo;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!(await ownedPromo(session.user.id, params.id))) {
    return NextResponse.json({ error: "That promo is not on your booth" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const data: Prisma.PromoUpdateInput = {};
  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (!t) return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
    data.title = t;
  }
  for (const f of ["details", "imageUrl", "window"] as const) {
    if (f in body) data[f] = (typeof body[f] === "string" ? body[f].trim() : "") || null;
  }
  if ("active" in body) data.active = body.active !== false;

  const promo = await prisma.promo.update({ where: { id: params.id }, data });
  return NextResponse.json(promo);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!(await ownedPromo(session.user.id, params.id))) {
    return NextResponse.json({ error: "That promo is not on your booth" }, { status: 403 });
  }
  await prisma.promo.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
