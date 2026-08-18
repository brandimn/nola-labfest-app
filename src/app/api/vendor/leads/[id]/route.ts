import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMyBooth } from "@/lib/booth";

// Vendors (and admins) can write a note on a lead they own.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  if (session.user.role !== "VENDOR" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const vendor = await getMyBooth(session.user.id);
  if (!vendor) return NextResponse.json({ error: "No vendor profile found for your account" }, { status: 400 });

  const lead = await prisma.lead.findUnique({ where: { id: params.id } });
  if (!lead || lead.vendorId !== vendor.id) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const notes = typeof body?.notes === "string" ? body.notes.slice(0, 2000) : "";
  const updated = await prisma.lead.update({ where: { id: lead.id }, data: { notes } });
  return NextResponse.json({ ok: true, notes: updated.notes ?? "" });
}
