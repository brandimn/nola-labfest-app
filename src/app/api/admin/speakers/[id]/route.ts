import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s?.user || s.user.role !== "ADMIN") return null;
  return s.user;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const s = await prisma.speaker.update({
    where: { id: params.id },
    data: {
      name: body.name?.trim(),
      title: body.title || null,
      company: body.company || null,
      bio: body.bio || null,
      photoUrl: body.photoUrl || null,
      linkedIn: body.linkedIn || null,
    },
  });
  return NextResponse.json(s);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.speaker.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
