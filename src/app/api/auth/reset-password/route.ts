import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!token || !password) {
    return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const reset = await prisma.passwordReset.findUnique({ where: { token } });
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    return NextResponse.json({ error: "This reset link is invalid or has expired" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: reset.userId },
      data: { password: hashed },
    }),
    prisma.passwordReset.update({
      where: { id: reset.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
