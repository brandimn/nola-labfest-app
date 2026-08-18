import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import roster from "@/data/roster.json";
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
  if (!emailConfigured()) {
    return NextResponse.json(
      { error: "Email not configured. Set RESEND_API_KEY in Vercel environment variables." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const userId = body?.userId?.toString();
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Anyone still on mustChangePassword has never signed in, so they are on the
  // shared LabFest password. Tell them that one rather than resetting it, or
  // the invite would break the password Brandi has already handed out and the
  // app would be telling two different stories.
  let password: string;
  if (user.mustChangePassword) {
    password = roster.password;
  } else {
    password = generatePassword();
    await prisma.user.update({
      where: { id: userId },
      // They already chose their own, so a fresh one has to be picked again.
      data: { password: await bcrypt.hash(password, 10), mustChangePassword: true },
    });
  }

  const res = await sendInviteEmail({
    to: user.email,
    name: user.name,
    password,
  });
  if (!res.ok) {
    return NextResponse.json({ error: res.reason || "Email failed" }, { status: 500 });
  }
  await prisma.user.update({
    where: { id: userId },
    data: { invitedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
