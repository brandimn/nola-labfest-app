import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/push";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body?.title || !body?.body) return NextResponse.json({ error: "title and body required" }, { status: 400 });

  const ROLES = ["ATTENDEE", "VENDOR", "ADMIN"];
  const targetRole = ROLES.includes(body.targetRole) ? body.targetRole : null;

  const ann = await prisma.announcement.create({
    data: {
      title: body.title,
      body: body.body,
      targetRole,
      sentById: session.user.id,
    },
  });

  try {
    const result = await sendPush({
      title: body.title,
      body: body.body,
      url: body.url || "/",
      targetRole,
    });
    return NextResponse.json({ ...result, announcementId: ann.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Push failed", announcementId: ann.id }, { status: 500 });
  }
}
