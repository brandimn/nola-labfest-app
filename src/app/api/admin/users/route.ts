import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emailConfigured, sendInviteEmail } from "@/lib/email";

function generatePassword() {
  const letters = "abcdefghjkmnpqrstuvwxyz";
  const digits = "0123456789";
  const l =
    letters[Math.floor(Math.random() * letters.length)] +
    letters[Math.floor(Math.random() * letters.length)];
  let d = "";
  for (let i = 0; i < 4; i++) d += digits[Math.floor(Math.random() * digits.length)];
  return `${l}-${d}`;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.email) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: `A user with email ${email} already exists` },
      { status: 409 }
    );
  }

  const plainPassword = body.password?.trim() || generatePassword();
  const hashed = await bcrypt.hash(plainPassword, 10);
  const sendEmail = body.sendEmail !== false; // default on
  const role =
    body.role === "VENDOR" || body.role === "ADMIN" ? body.role : "ATTENDEE";

  const created = await prisma.user.create({
    data: {
      email,
      name: body.name.trim(),
      role,
      password: hashed,
      company: body.company?.trim() || null,
      title: body.title?.trim() || null,
      phone: body.phone?.trim() || null,
    },
    select: { id: true, email: true, name: true, role: true },
  });

  let emailStatus: { ok: boolean; reason?: string } | null = null;
  if (sendEmail && emailConfigured()) {
    const send = await sendInviteEmail({
      to: email,
      name: created.name,
      password: plainPassword,
    });
    emailStatus = send;
    if (send.ok) {
      await prisma.user.update({
        where: { id: created.id },
        data: { invitedAt: new Date() },
      });
    }
  }

  return NextResponse.json({
    ...created,
    password: plainPassword,
    email: created.email,
    emailed: emailStatus,
    emailConfigured: emailConfigured(),
  });
}
