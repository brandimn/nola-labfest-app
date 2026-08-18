import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const current = typeof body.current === "string" ? body.current : "";
  const next = typeof body.next === "string" ? body.next : "";

  if (next.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }
  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Someone forced onto this screen has just signed in with the shared LabFest
  // password, which everyone already knows. Asking them to type it again proves
  // nothing, so only require it for a voluntary change later on.
  if (!me.mustChangePassword) {
    const ok = await bcrypt.compare(current, me.password);
    if (!ok) {
      return NextResponse.json({ error: "Your current password is not right" }, { status: 400 });
    }
  }

  const same = await bcrypt.compare(next, me.password);
  if (same) {
    return NextResponse.json({ error: "Please pick a different password than the one you have" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: me.id },
    data: { password: await bcrypt.hash(next, 10), mustChangePassword: false },
  });
  return NextResponse.json({ ok: true });
}
