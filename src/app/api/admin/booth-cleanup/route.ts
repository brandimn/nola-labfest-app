import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import roster from "@/data/roster.json";
import details from "@/data/booth-details.json";

const KNOWN: Record<string, { logoUrl?: string; website?: string }> = details;

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s?.user || s.user.role !== "ADMIN") return null;
  return s.user;
}

// "Level 3 (CC Company)" and "Level 3" are the same company. Squash to letters
// and digits so near-misses line up, then compare on a shared prefix.
function key(name: string) {
  return name.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]/g, "");
}
function looksLikeSame(a: string, b: string) {
  const ka = key(a), kb = key(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  const short = ka.length < kb.length ? ka : kb;
  const long = ka.length < kb.length ? kb : ka;
  return short.length >= 4 && long.startsWith(short);
}

function richness(v: { logoUrl: string | null; description: string | null; website: string | null; categories: string[]; sponsorTier: string | null; isLunchSponsor: boolean; atLOTM: boolean }) {
  return [
    v.logoUrl, v.description, v.website, v.sponsorTier,
    v.categories?.length ? "cats" : null,
    v.isLunchSponsor ? "lunch" : null,
    v.atLOTM ? "lotm" : null,
  ].filter(Boolean).length;
}

async function findPairs() {
  const booths = await prisma.vendor.findMany({ orderBy: { name: "asc" } });
  const pairs: { keepId: string; removeId: string; keepName: string; removeName: string }[] = [];
  const used = new Set<string>();
  for (const a of booths) {
    for (const b of booths) {
      if (a.id === b.id) continue;
      if (used.has(a.id) || used.has(b.id)) continue;
      if (a.name === b.name) continue;
      if (!looksLikeSame(a.name, b.name)) continue;
      const [keep, remove] = richness(a) >= richness(b) ? [a, b] : [b, a];
      pairs.push({ keepId: keep.id, removeId: remove.id, keepName: keep.name, removeName: remove.name });
      used.add(a.id); used.add(b.id);
    }
  }
  return pairs;
}

async function mergeOne(keepId: string, removeId: string) {
  const keep = await prisma.vendor.findUnique({ where: { id: keepId } });
  const remove = await prisma.vendor.findUnique({ where: { id: removeId } });
  if (!keep || !remove) return null;

  await prisma.user.updateMany({ where: { vendorId: removeId }, data: { vendorId: keepId } });
  await prisma.lead.updateMany({ where: { vendorId: removeId }, data: { vendorId: keepId } });
  await prisma.boothScan.updateMany({ where: { vendorId: removeId }, data: { vendorId: keepId } });
  await prisma.boothVote.updateMany({ where: { vendorId: removeId }, data: { vendorId: keepId } });

  const gained: string[] = [];
  if (!keep.logoUrl && remove.logoUrl) gained.push("logo");
  if (!keep.description && remove.description) gained.push("description");
  if (!keep.website && remove.website) gained.push("website");
  if (!keep.categories?.length && remove.categories?.length) gained.push("categories");
  if (!keep.sponsorTier && remove.sponsorTier) gained.push("sponsor tier");
  if (!keep.isLunchSponsor && remove.isLunchSponsor) gained.push("lunch sponsor");
  if (!keep.atLOTM && remove.atLOTM) gained.push("LOTM");

  await prisma.vendor.update({
    where: { id: keepId },
    data: {
      logoUrl: keep.logoUrl ?? remove.logoUrl,
      website: keep.website ?? remove.website,
      description: keep.description ?? remove.description,
      contactEmail: keep.contactEmail ?? remove.contactEmail,
      contactPhone: keep.contactPhone ?? remove.contactPhone,
      sponsorTier: keep.sponsorTier ?? remove.sponsorTier,
      categories: keep.categories?.length ? keep.categories : remove.categories,
      category: keep.category ?? remove.category,
      boothNumber: keep.boothNumber === "TBD" && remove.boothNumber !== "TBD" ? remove.boothNumber : keep.boothNumber,
      isLunchSponsor: keep.isLunchSponsor || remove.isLunchSponsor,
      atLOTM: keep.atLOTM || remove.atLOTM,
      userId: keep.userId ?? remove.userId,
    },
  });
  await prisma.vendor.update({ where: { id: removeId }, data: { userId: null } });
  await prisma.vendor.delete({ where: { id: removeId } });
  return { kept: keep.name, removed: remove.name, gained };
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const onList = new Set(roster.companies);
  const booths = await prisma.vendor.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { staff: true, leads: true, boothScans: true } } },
  });

  const shape = (b: (typeof booths)[number]) => ({
    id: b.id,
    name: b.name,
    boothNumber: b.boothNumber,
    onRoster: onList.has(b.name),
    staff: b._count.staff,
    leads: b._count.leads,
    scans: b._count.boothScans,
    detail: richness(b),
    has: {
      logo: !!b.logoUrl,
      website: !!b.website,
      categories: b.categories?.length ?? 0,
      description: !!b.description,
      sponsorTier: b.sponsorTier,
      lunchSponsor: b.isLunchSponsor,
      lotm: b.atLOTM,
    },
  });

  // Pair a roster booth with an older booth that is plainly the same company.
  const pairs: { keep: ReturnType<typeof shape>; remove: ReturnType<typeof shape> }[] = [];
  const used = new Set<string>();
  for (const a of booths) {
    for (const b of booths) {
      if (a.id === b.id) continue;
      if (used.has(a.id) || used.has(b.id)) continue;
      if (a.name === b.name) continue;
      if (!looksLikeSame(a.name, b.name)) continue;
      // Keep whichever record carries more real content.
      const [keep, remove] = richness(a) >= richness(b) ? [a, b] : [b, a];
      pairs.push({ keep: shape(keep), remove: shape(remove) });
      used.add(a.id); used.add(b.id);
    }
  }

  const gaps = booths
    .filter((b) => !pairs.some((p) => p.remove.id === b.id))
    .map((b) => ({
      id: b.id,
      name: b.name,
      onRoster: onList.has(b.name),
      missing: [
        !b.logoUrl && "logo",
        !b.website && "website",
        (!b.categories || b.categories.length === 0) && "category",
        !b.description && "description",
      ].filter(Boolean) as string[],
      canAutoFill: !!(
        (!b.logoUrl && KNOWN[b.name]?.logoUrl) || (!b.website && KNOWN[b.name]?.website)
      ),
    }))
    .filter((b) => b.missing.length > 0);

  return NextResponse.json({
    totalBooths: booths.length,
    duplicates: pairs,
    notOnRoster: booths.filter((b) => !onList.has(b.name) && !pairs.some((p) => p.remove.id === b.id)).map(shape),
    gaps,
    autoFillable: gaps.filter((g) => g.canAutoFill).length,
  });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));

  // Merge a duplicate into the booth we are keeping. Everything attached to the
  // duplicate moves across first, so no staff, lead or scan is lost.
  if (body?.action === "MERGE") {
    const { keepId, removeId } = body;
    if (!keepId || !removeId || keepId === removeId) {
      return NextResponse.json({ error: "Need two different booths" }, { status: 400 });
    }
    const merged = await mergeOne(keepId, removeId);
    if (!merged) return NextResponse.json({ error: "Booth not found" }, { status: 404 });
    return NextResponse.json({ ok: true, merged });
  }

  // Merge every pair we detected, in one go.
  if (body?.action === "MERGE_ALL") {
    const pairs = await findPairs();
    const merged = [];
    for (const p of pairs) {
      const r = await mergeOne(p.keepId, p.removeId);
      if (r) merged.push(r);
    }
    return NextResponse.json({ ok: true, count: merged.length, merged });
  }

  // Fill only the logo and website we can source. Never overwrites, never
  // invents a description or a category.
  if (body?.action === "FILL") {
    const filled: { name: string; set: string[] }[] = [];
    for (const [name, known] of Object.entries(KNOWN)) {
      const booth = await prisma.vendor.findFirst({ where: { name } });
      if (!booth) continue;
      const data: { logoUrl?: string; website?: string } = {};
      if (!booth.logoUrl && known.logoUrl) data.logoUrl = known.logoUrl;
      if (!booth.website && known.website) data.website = known.website;
      if (Object.keys(data).length === 0) continue;
      await prisma.vendor.update({ where: { id: booth.id }, data });
      filled.push({ name, set: Object.keys(data) });
    }
    return NextResponse.json({ ok: true, filled });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
