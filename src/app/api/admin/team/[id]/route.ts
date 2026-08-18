import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  return s?.user?.role === "ADMIN";
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const data: Prisma.TeamMemberUpdateInput = {};
  if (typeof body.name === "string") data.name = body.name.trim();
  if ("title" in body) data.title = body.title || null;
  if ("email" in body) data.email = body.email || null;
  if ("phone" in body) data.phone = body.phone || null;
  if ("photoUrl" in body) data.photoUrl = body.photoUrl || null;
  if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;

  try {
    const m = await prisma.teamMember.update({ where: { id: params.id }, data });
    return NextResponse.json(m);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    await prisma.teamMember.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }
    throw e;
  }
}
