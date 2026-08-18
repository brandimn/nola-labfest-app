import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s?.user || s.user.role !== "ADMIN") return null;
  return s.user;
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  const s = await prisma.speaker.create({
    data: {
      name: body.name.trim(),
      title: body.title || null,
      company: body.company || null,
      bio: body.bio || null,
      photoUrl: body.photoUrl || null,
      linkedIn: body.linkedIn || null,
    },
  });
  return NextResponse.json(s);
}
