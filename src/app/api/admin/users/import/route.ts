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

type Row = {
  name: string;
  email: string;
  company?: string;
  title?: string;
  phone?: string;
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const rows: Row[] = Array.isArray(body?.rows) ? body.rows : [];
  const sendEmails = !!body?.sendEmails;
  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  const results = [];
  for (const r of rows) {
    const email = r.email?.trim().toLowerCase();
    const name = r.name?.trim();
    if (!email || !name) {
      results.push({ ok: false, email: email || "(no email)", error: "Missing name or email" });
      continue;
    }
    try {
      const plain = generatePassword();
      const hashed = await bcrypt.hash(plain, 10);
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        await prisma.user.update({
          where: { email },
          data: {
            name,
            password: hashed,
            company: r.company?.trim() || existing.company,
            title: r.title?.trim() || existing.title,
            phone: r.phone?.trim() || existing.phone,
          },
        });
      } else {
        await prisma.user.create({
          data: {
            email,
            name,
            role: "ATTENDEE",
            password: hashed,
            company: r.company?.trim() || null,
            title: r.title?.trim() || null,
            phone: r.phone?.trim() || null,
          },
        });
      }
      let emailed: { ok: boolean; reason?: string } | null = null;
      if (sendEmails) {
        const send = await sendInviteEmail({ to: email, name, password: plain });
        emailed = send;
        if (send.ok) {
          await prisma.user.update({
            where: { email },
            data: { invitedAt: new Date() },
          });
        }
      }
      results.push({
        ok: true,
        email,
        name,
        password: plain,
        created: !existing,
        emailed,
      });
    } catch (e: any) {
      results.push({ ok: false, email, error: e.message || "Unknown error" });
    }
  }

  return NextResponse.json({ results, emailConfigured: emailConfigured() });
}
