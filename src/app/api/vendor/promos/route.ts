import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMyBooth } from "@/lib/booth";

// A vendor adds a promo to the booth they own or staff. Access is by ownership,
// not role, so a login that is both a vendor and a speaker still works.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const booth = await getMyBooth(session.user.id);
  if (!booth) return NextResponse.json({ error: "No booth is linked to your account" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "Please give the promo a short title" }, { status: 400 });

  const promo = await prisma.promo.create({
    data: {
      vendorId: booth.id,
      title,
      details: typeof body.details === "string" ? body.details.trim() || null : null,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl.trim() || null : null,
      window: typeof body.window === "string" ? body.window.trim() || null : null,
      active: body.active !== false,
      createdById: session.user.id,
    },
  });
  return NextResponse.json(promo);
}
