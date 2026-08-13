import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url : "";
  if (!url.startsWith("data:image/")) {
    return NextResponse.json({ error: "Please choose a valid image" }, { status: 400 });
  }
  // Guard against oversized payloads (~6MB of base64).
  if (url.length > 6_000_000) {
    return NextResponse.json({ error: "That photo is too large. Try again." }, { status: 413 });
  }
  const caption =
    typeof body?.caption === "string" ? body.caption.trim().slice(0, 140) || null : null;

  const photo = await prisma.galleryPhoto.create({
    data: {
      url,
      caption,
      uploaderId: session.user.id,
      uploaderName: session.user.name || "Guest",
    },
  });
  return NextResponse.json({ id: photo.id });
}
