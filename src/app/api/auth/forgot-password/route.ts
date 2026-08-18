import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

const RESET_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Always respond the same way to avoid revealing whether an email exists
  const genericOk = NextResponse.json({ ok: true });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return genericOk;

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_WINDOW_MS);

  await prisma.passwordReset.create({
    data: { userId: user.id, token, expiresAt },
  });

  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  // Fire and forget, but log on server if it fails
  const result = await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    resetUrl,
  });
  if (!result.ok) {
    console.error("Password reset email failed:", result.reason);
  }

  return genericOk;
}
