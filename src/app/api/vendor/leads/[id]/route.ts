import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMyBooth } from "@/lib/booth";

// Vendors (and admins) can write a note on a lead they own.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  // No role check: the booth below is the real gate, and it is read fresh.
  // The role in a sign in token is whatever it was when they signed in, so
  // checking it locked out anyone switched to a vendor mid event.
  const vendor = await getMyBooth(session.user.id);
  if (!vendor) {
    return NextResponse.json({ error: "Your account is not on a booth" }, { status: 403 });
  }

  const lead = await prisma.lead.findUnique({ where: { id: params.id } });
  if (!lead || lead.vendorId !== vendor.id) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const notes = typeof body?.notes === "string" ? body.notes.slice(0, 2000) : "";
  const updated = await prisma.lead.update({ where: { id: lead.id }, data: { notes } });
  return NextResponse.json({ ok: true, notes: updated.notes ?? "" });
}
