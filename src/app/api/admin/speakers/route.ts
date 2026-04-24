import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const speaker = await prisma.speaker.create({
    data: {
      name: body.name.trim(),
      title: body.title?.trim() || null,
      company: body.company?.trim() || null,
      bio: body.bio?.trim() || null,
      linkedIn: body.linkedIn?.trim() || null,
      photoUrl: body.photoUrl || null,
    },
    select: { id: true, name: true },
  });

  return NextResponse.json(speaker);
}
