import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

async function isAdmin() {
  const s = await getServerSession(authOptions);
  return s?.user?.role === "ADMIN";
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Partial update — only touch fields that were actually sent.
  const data: Prisma.SessionUncheckedUpdateInput = {};
  if (typeof body.title === "string") data.title = body.title;
  if ("description" in body) data.description = body.description || null;
  if ("speaker" in body) data.speaker = body.speaker || null;
  if ("speakerId" in body) data.speakerId = body.speakerId || null;
  if ("location" in body) data.location = body.location || null;
  if (body.startsAt) data.startsAt = new Date(body.startsAt);
  if (body.endsAt) data.endsAt = new Date(body.endsAt);
  if ("track" in body) data.track = body.track || null;
  if ("event" in body) data.event = body.event === "LOTM" ? "LOTM" : "LABFEST";
  if ("isFeatured" in body) data.isFeatured = body.isFeatured === true;

  try {
    const updated = await prisma.session.update({ where: { id: params.id }, data });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    await prisma.session.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    throw e;
  }
}
