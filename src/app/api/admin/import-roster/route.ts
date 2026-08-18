import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import roster from "@/data/roster.json";

type Result = { email: string; what: string; ok: boolean; note?: string };

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s?.user || s.user.role !== "ADMIN") return null;
  return s.user;
}

// Preview: what would change, without touching anything.
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const emails = [
    ...roster.vendors.map((v) => v.email),
    ...roster.speakers.map((s) => s.email),
  ];
  const existing = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true },
  });
  const have = new Set(existing.map((u) => u.email));
  return NextResponse.json({
    vendors: roster.vendors.length,
    speakers: roster.speakers.length,
    companies: roster.companies.length,
    alreadyInSystem: have.size,
    willCreate: emails.filter((e) => !have.has(e)).length,
  });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== "IMPORT") {
    return NextResponse.json({ error: "Not confirmed" }, { status: 400 });
  }

  const hash = await bcrypt.hash(roster.password, 10);
  const results: Result[] = [];

  // 1. Booths, one per company.
  const vendorByCompany = new Map<string, string>();
  for (const company of roster.companies) {
    const found = await prisma.vendor.findFirst({ where: { name: company } });
    if (found) {
      vendorByCompany.set(company, found.id);
      results.push({ email: company, what: "booth", ok: true, note: "already existed" });
    } else {
      const v = await prisma.vendor.create({ data: { name: company, boothNumber: "TBD" } });
      vendorByCompany.set(company, v.id);
      results.push({ email: company, what: "booth", ok: true, note: "created" });
    }
  }

  // 2. Vendor logins, linked to their booth.
  for (const v of roster.vendors) {
    try {
      const user = await prisma.user.upsert({
        where: { email: v.email },
        update: { name: v.name || undefined, company: v.company || undefined, role: "VENDOR" },
        create: {
          email: v.email,
          name: v.name || v.email.split("@")[0],
          company: v.company || null,
          role: "VENDOR",
          password: hash,
          mustChangePassword: true,
        },
      });
      const vendorId = vendorByCompany.get(v.company);
      if (vendorId) {
        // Everyone from the company is booth staff: they all scan badges, share
        // one lead list, and can edit the listing.
        await prisma.user.update({ where: { id: user.id }, data: { vendorId } });
        // The first one listed is also the primary contact on the booth record.
        const booth = await prisma.vendor.findUnique({ where: { id: vendorId } });
        if (booth && !booth.userId) {
          await prisma.vendor.update({ where: { id: vendorId }, data: { userId: user.id } });
        }
      }
      results.push({ email: v.email, what: "vendor", ok: true, note: v.company });
    } catch (e: any) {
      results.push({ email: v.email, what: "vendor", ok: false, note: e?.message ?? "failed" });
    }
  }

  // 3. Speaker logins + profiles.
  for (const s of roster.speakers) {
    try {
      const existing = await prisma.user.findUnique({ where: { email: s.email } });
      const user = await prisma.user.upsert({
        where: { email: s.email },
        // Never demote an admin (Brandi) or a vendor (Rob) to SPEAKER.
        update: {
          name: s.name,
          company: s.company || undefined,
          role: existing && existing.role !== "ATTENDEE" ? existing.role : "SPEAKER",
        },
        create: {
          email: s.email,
          name: s.name,
          company: s.company || null,
          role: "SPEAKER",
          password: hash,
          mustChangePassword: true,
        },
      });
      const already = await prisma.speaker.findFirst({
        where: { OR: [{ userId: user.id }, { name: s.name }] },
      });
      if (already) {
        await prisma.speaker.update({
          where: { id: already.id },
          data: { userId: user.id, company: s.company || already.company },
        });
        results.push({ email: s.email, what: "speaker", ok: true, note: "linked existing profile" });
      } else {
        await prisma.speaker.create({
          data: { name: s.name, company: s.company || null, userId: user.id },
        });
        results.push({ email: s.email, what: "speaker", ok: true, note: "profile created" });
      }
    } catch (e: any) {
      results.push({ email: s.email, what: "speaker", ok: false, note: e?.message ?? "failed" });
    }
  }

  return NextResponse.json({
    ok: true,
    created: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok),
    results,
  });
}
