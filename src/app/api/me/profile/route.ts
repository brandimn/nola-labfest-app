import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Anyone signed in can edit their own badge details. Email is deliberately
// not editable here: it is the login, and changing it could collide with
// another account.
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Please enter your name" }, { status: 400 });

  const me = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      company: typeof body.company === "string" ? body.company.trim() || null : undefined,
      title: typeof body.title === "string" ? body.title.trim() || null : undefined,
      phone: typeof body.phone === "string" ? body.phone.trim() || null : undefined,
    },
    select: { id: true, name: true, company: true, title: true, phone: true },
  });
  return NextResponse.json(me);
}
