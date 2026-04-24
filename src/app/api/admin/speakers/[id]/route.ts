import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const existing = await prisma.speaker.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Speaker not found" }, { status: 404 });

  const data: Record<string, any> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.title === "string") data.title = body.title.trim() || null;
  if (typeof body.company === "string") data.company = body.company.trim() || null;
  if (typeof body.bio === "string") data.bio = body.bio.trim() || null;
  if (typeof body.linkedIn === "string") data.linkedIn = body.linkedIn.trim() || null;
  if (typeof body.photoUrl === "string") data.photoUrl = body.photoUrl || null;

  const updated = await prisma.speaker.update({
    where: { id: params.id },
    data,
    select: { id: true, name: true },
  });
  return NextResponse.json({ ok: true, ...updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const existing = await prisma.speaker.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Speaker not found" }, { status: 404 });

  await prisma.speaker.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
