import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  return s?.user?.role === "ADMIN";
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body?.name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const count = await prisma.teamMember.count();
  const m = await prisma.teamMember.create({
    data: {
      name: body.name.trim(),
      title: body.title || null,
      email: body.email || null,
      phone: body.phone || null,
      photoUrl: body.photoUrl || null,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : count + 1,
    },
  });
  return NextResponse.json(m);
}
