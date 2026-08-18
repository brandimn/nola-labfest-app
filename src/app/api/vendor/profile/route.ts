import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMyBooth } from "@/lib/booth";

// A vendor edits the booth they own. Access is by ownership, not by role,
// so a login that is both a vendor and a speaker still works.
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const booth = await getMyBooth(session.user.id);
  if (!booth) {
    return NextResponse.json({ error: "No booth is linked to your account" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Please enter your company name" }, { status: 400 });

  // Booth number and sponsor tier are set by the organisers, not the vendor.
  const updated = await prisma.vendor.update({
    where: { id: booth.id },
    data: {
      name,
      description: typeof body.description === "string" ? body.description.trim() || null : undefined,
      website: typeof body.website === "string" ? body.website.trim() || null : undefined,
      contactEmail: typeof body.contactEmail === "string" ? body.contactEmail.trim() || null : undefined,
      contactPhone: typeof body.contactPhone === "string" ? body.contactPhone.trim() || null : undefined,
      logoUrl: typeof body.logoUrl === "string" ? body.logoUrl.trim() || null : undefined,
      categories: Array.isArray(body.categories)
        ? body.categories.map((c: unknown) => String(c).trim()).filter(Boolean)
        : undefined,
    },
  });
  return NextResponse.json(updated);
}
