import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (s?.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  if (!body.title || !body.startsAt || !body.endsAt) {
    return NextResponse.json({ error: "title, startsAt, endsAt required" }, { status: 400 });
  }
  const created = await prisma.session.create({
    data: {
      title: body.title,
      description: body.description || null,
      speaker: body.speaker || null,
      location: body.location || null,
      startsAt: new Date(body.startsAt),
      endsAt: new Date(body.endsAt),
      track: body.track || null,
    },
  });
  return NextResponse.json(created);
}
