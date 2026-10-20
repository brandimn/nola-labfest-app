import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Everything about the gallery except the pictures themselves, so the browser
// can fetch them one at a time and build the download itself. The photos are
// far too big to come back in one response.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }
  const photos = await prisma.galleryPhoto.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, caption: true, uploaderName: true, createdAt: true },
  });
  return NextResponse.json({ photos }, { headers: { "Cache-Control": "no-store" } });
}
