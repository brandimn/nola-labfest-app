import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ResendEvent = {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[];
    from?: string;
  };
};

// Resend posts events like "email.opened", "email.delivered", "email.bounced" here.
// We only care about opens — match by recipient email and stamp the user.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as ResendEvent | null;
  if (!body?.type || !body.data) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const to = body.data.to?.[0]?.toLowerCase();
  const when = body.created_at ? new Date(body.created_at) : new Date();

  if (body.type === "email.opened" && to) {
    await prisma.user.updateMany({
      where: { email: to, openedInviteAt: null },
      data: { openedInviteAt: when },
    });
  }

  return NextResponse.json({ ok: true });
}
