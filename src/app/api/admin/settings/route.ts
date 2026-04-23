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
  const key = body?.key?.toString();
  const value = (body?.value ?? "").toString();
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  if (!value) {
    await prisma.setting.deleteMany({ where: { key } });
  } else {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
  return NextResponse.json({ ok: true });
}
