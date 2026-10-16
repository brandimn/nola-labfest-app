import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMyBooth } from "@/lib/booth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  // Whether somebody can capture a lead is decided by the booth they are on,
  // looked up fresh, not by the role in their sign in token. The token keeps
  // whatever role they had when they signed in, so somebody switched to a
  // vendor during the event stayed locked out until they signed out and back
  // in, with nothing on screen to explain why.
  const vendor = await getMyBooth(session.user.id);
  if (!vendor) {
    return NextResponse.json(
      {
        error:
          session.user.role === "ADMIN"
            ? "Admin accounts have no booth, so there is no lead list to add to."
            : "Your account is not on a booth yet. Ask at the registration desk.",
      },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const token = body?.token?.toString().trim();
  if (!token) return NextResponse.json({ error: "Missing badge token" }, { status: 400 });

  const attendee = await prisma.user.findUnique({ where: { badgeToken: token } });
  if (!attendee) return NextResponse.json({ error: "Invalid badge" }, { status: 404 });

  let lead = await prisma.lead.findUnique({
    where: { vendorId_attendeeId: { vendorId: vendor.id, attendeeId: attendee.id } },
  });
  const alreadyCaptured = !!lead;
  if (!lead) {
    lead = await prisma.lead.create({
      data: { vendorId: vendor.id, attendeeId: attendee.id },
    });
  }
  return NextResponse.json({
    leadId: lead.id,
    notes: lead.notes ?? "",
    alreadyCaptured,
    attendee: {
      name: attendee.name,
      email: attendee.email,
      company: attendee.company,
      title: attendee.title,
      phone: attendee.phone,
    },
  });
}
