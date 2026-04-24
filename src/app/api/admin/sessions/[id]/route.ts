import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function isAdmin() {
  const s = await getServerSession(authOptions);
  return s?.user?.role === "ADMIN";
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const updated = await prisma.session.update({
    where: { id: params.id },
    data: {
      title: body.title,
      description: body.description || null,
      speaker: body.speaker || null,
      speakerId: body.speakerId || null,
      location: body.location || null,
      startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
      endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
      track: body.track || null,
      event: body.event === "LOTM" ? "LOTM" : "LABFEST",
      isFeatured: body.isFeatured === true,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.session.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
