import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generatePassword() {
  const letters = "abcdefghjkmnpqrstuvwxyz";
  const digits = "0123456789";
  const l =
    letters[Math.floor(Math.random() * letters.length)] +
    letters[Math.floor(Math.random() * letters.length)];
  let d = "";
  for (let i = 0; i < 4; i++) d += digits[Math.floor(Math.random() * digits.length)];
  return `${l}-${d}`;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (body.resetPassword) {
    const plain = generatePassword();
    const hashed = await bcrypt.hash(plain, 10);
    await prisma.user.update({
      where: { id: params.id },
      data: { password: hashed },
    });
    return NextResponse.json({ ok: true, newPassword: plain });
  }

  const data: Record<string, any> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.email === "string" && body.email.trim()) {
    const newEmail = body.email.trim().toLowerCase();
    if (newEmail !== existing.email) {
      const conflict = await prisma.user.findUnique({ where: { email: newEmail } });
      if (conflict) {
        return NextResponse.json(
          { error: `Another user already has email ${newEmail}` },
          { status: 409 }
        );
      }
      data.email = newEmail;
    }
  }
  if (body.role === "ATTENDEE" || body.role === "VENDOR" || body.role === "ADMIN") {
    data.role = body.role;
  }
  if (typeof body.company === "string") data.company = body.company.trim() || null;
  if (typeof body.title === "string") data.title = body.title.trim() || null;
  if (typeof body.phone === "string") data.phone = body.phone.trim() || null;

  const updated = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, email: true, name: true, role: true },
  });

  // Handle vendor assignment — only meaningful when role is VENDOR
  if (body.vendorId !== undefined) {
    const newVendorId: string | null = body.vendorId || null;

    // Clear any vendor row currently pointing at this user.
    await prisma.vendor.updateMany({
      where: { userId: params.id },
      data: { userId: null },
    });

    if (newVendorId) {
      // Clear any other user that was linked to this vendor (one-to-one).
      await prisma.vendor.update({
        where: { id: newVendorId },
        data: { userId: params.id },
      });
    }
  }

  return NextResponse.json({ ok: true, user: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  if (session.user.id === params.id) {
    return NextResponse.json(
      { error: "You can't delete the account you're signed in as." },
      { status: 400 }
    );
  }
  const existing = await prisma.user.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
