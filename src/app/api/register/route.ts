import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password || !body?.name) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const email = String(body.email).toLowerCase().trim();
  const name = String(body.name).trim();
  if (body.password.length < 6) {
    return NextResponse.json({ error: "Password must be 6+ chars" }, { status: 400 });
  }
  const hash = await bcrypt.hash(body.password, 10);
  const nname = norm(name);

  // A pre-loaded person on the roster who hasn't set up their own login yet:
  // they have a badge type and are still on the default password or a
  // placeholder email. Registering "claims" that record instead of duplicating.
  const claimables = await prisma.user.findMany({
    where: {
      badgeType: { not: null },
      role: { in: ["ATTENDEE", "VENDOR", "SPEAKER"] },
      OR: [{ email: { endsWith: "@labfest.badge" } }, { mustChangePassword: true }],
    },
    select: { id: true, name: true, email: true, company: true, title: true, phone: true },
  });
  const match = claimables.find((u) => norm(u.name) === nname);

  const byEmail = await prisma.user.findUnique({ where: { email } });

  // The email is already in use by someone who isn't the person claiming.
  if (byEmail && (!match || byEmail.id !== match.id)) {
    return NextResponse.json(
      { error: "That email is already in use. If you registered as a group, please use your own email." },
      { status: 400 }
    );
  }

  // Claim the pre-loaded record: attach this email + password to it.
  if (match) {
    await prisma.user.update({
      where: { id: match.id },
      data: {
        email,
        password: hash,
        mustChangePassword: false,
        company: match.company || body.company || null,
        title: match.title || body.title || null,
        phone: match.phone || body.phone || null,
      },
    });
    return NextResponse.json({ ok: true, claimed: true });
  }

  // Not on the roster — a walk-up. Create a fresh attendee.
  try {
    await prisma.user.create({
      data: {
        email,
        password: hash,
        name,
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
  return NextResponse.json({ ok: true, claimed: false });
}
