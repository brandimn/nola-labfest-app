import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// A speaker edits the profile they own. Ownership, not role, so Rob (who is
// also a vendor) can edit his speaker bio too.
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const profile = await prisma.speaker.findUnique({ where: { userId: session.user.id } });
  if (!profile) {
    return NextResponse.json({ error: "No speaker profile is linked to your account" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Please enter your name" }, { status: 400 });

  const updated = await prisma.speaker.update({
    where: { id: profile.id },
    data: {
      name,
      title: typeof body.title === "string" ? body.title.trim() || null : undefined,
      company: typeof body.company === "string" ? body.company.trim() || null : undefined,
      bio: typeof body.bio === "string" ? body.bio.trim() || null : undefined,
      linkedIn: typeof body.linkedIn === "string" ? body.linkedIn.trim() || null : undefined,
      photoUrl: typeof body.photoUrl === "string" ? body.photoUrl.trim() || null : undefined,
    },
  });
  return NextResponse.json(updated);
}
