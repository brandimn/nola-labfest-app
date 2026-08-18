import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password || !body?.name) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const email = String(body.email).toLowerCase().trim();
  if (body.password.length < 6) {
    return NextResponse.json({ error: "Password must be 6+ chars" }, { status: 400 });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 400 });
  }
  const hash = await bcrypt.hash(body.password, 10);
  try {
    await prisma.user.create({
      data: {
        email,
        password: hash,
        name: String(body.name).trim(),
        company: body.company || null,
        title: body.title || null,
        phone: body.phone || null,
        role: "ATTENDEE",
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }
    throw e;
  }
  return NextResponse.json({ ok: true });
}
