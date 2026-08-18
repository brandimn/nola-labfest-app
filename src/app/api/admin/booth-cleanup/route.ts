import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import roster from "@/data/roster.json";
import details from "@/data/booth-details.json";

const KNOWN: Record<string, { logoUrl?: string; website?: string }> = details;

// Merging touches several tables, so give the function room beyond the default.
export const maxDuration = 60;

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

type BoothRow = {
  id: string; name: string; boothNumber: string;
  logoUrl: string | null; description: string | null; website: string | null;
  categories: string[]; category: string | null; sponsorTier: string | null;
  isLunchSponsor: boolean; atLOTM: boolean; userId: string | null;
  contactEmail: string | null; contactPhone: string | null;
};

function richness(v: BoothRow) {
  return [
    v.logoUrl, v.description, v.website, v.sponsorTier,
    v.categories?.length ? "cats" : null,
    v.isLunchSponsor ? "lunch" : null,
    v.atLOTM ? "lotm" : null,
  ].filter(Boolean).length;
}

async function findPairs() {
  const booths = (await prisma.vendor.findMany({ orderBy: { name: "asc" } })) as BoothRow[];
  const pairs: { keep: BoothRow; remove: BoothRow }[] = [];
  const used = new Set<string>();
  for (const a of booths) {
    for (const b of booths) {
      if (a.id === b.id || a.name === b.name) continue;
      if (used.has(a.id) || used.has(b.id)) continue;
      if (!looksLikeSame(a.name, b.name)) continue;
      const [keep, remove] = richness(a) >= richness(b) ? [a, b] : [b, a];
      pairs.push({ keep, remove });
      used.add(a.id); used.add(b.id);
    }
  }
  return pairs;
}

async function mergeOne(keepId: string, removeId: string) {
  const keep = (await prisma.vendor.findUnique({ where: { id: keepId } })) as BoothRow | null;
  const remove = (await prisma.vendor.findUnique({ where: { id: removeId } })) as BoothRow | null;
  if (!keep || !remove) return null;

  const gained: string[] = [];
  if (!keep.logoUrl && remove.logoUrl) gained.push("logo");
  if (!keep.description && remove.description) gained.push("description");
  if (!keep.website && remove.website) gained.push("website");
  if (!keep.categories?.length && remove.categories?.length) gained.push("categories");
  if (!keep.sponsorTier && remove.sponsorTier) gained.push("sponsor tier");
  if (!keep.isLunchSponsor && remove.isLunchSponsor) gained.push("lunch sponsor");
  if (!keep.atLOTM && remove.atLOTM) gained.push("LOTM");

  // Scans and leads are unique per attendee+booth. If the same attendee is on
  // both booths, moving the row would collide, so drop the duplicate instead.
  const [keepScans, keepLeads] = await Promise.all([
    prisma.boothScan.findMany({ where: { vendorId: keepId }, select: { attendeeId: true } }),
    prisma.lead.findMany({ where: { vendorId: keepId }, select: { attendeeId: true } }),
  ]);
  const scanAttendees = new Set(keepScans.map((s) => s.attendeeId));
  const leadAttendees = new Set(keepLeads.map((l) => l.attendeeId));

  await prisma.$transaction([
    // Release the unique userId from the duplicate BEFORE the keeper claims it.
    prisma.vendor.update({ where: { id: removeId }, data: { userId: null } }),

    prisma.user.updateMany({ where: { vendorId: removeId }, data: { vendorId: keepId } }),

    prisma.boothScan.deleteMany({
      where: { vendorId: removeId, attendeeId: { in: [...scanAttendees] } },
    }),
    prisma.boothScan.updateMany({ where: { vendorId: removeId }, data: { vendorId: keepId } }),

    prisma.lead.deleteMany({
      where: { vendorId: removeId, attendeeId: { in: [...leadAttendees] } },
    }),
    prisma.lead.updateMany({ where: { vendorId: removeId }, data: { vendorId: keepId } }),

    // One vote per attendee overall, so these can never collide on the keeper.
    prisma.boothVote.updateMany({ where: { vendorId: removeId }, data: { vendorId: keepId } }),

    prisma.vendor.update({
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
        boothNumber:
          keep.boothNumber === "TBD" && remove.boothNumber !== "TBD"
            ? remove.boothNumber
            : keep.boothNumber,
        isLunchSponsor: keep.isLunchSponsor || remove.isLunchSponsor,
        atLOTM: keep.atLOTM || remove.atLOTM,
        userId: keep.userId ?? remove.userId,
      },
    }),

    prisma.vendor.delete({ where: { id: removeId } }),
  ]);

  return { kept: keep.name, removed: remove.name, gained };
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
  const onList = new Set(roster.companies);
  const booths = await prisma.vendor.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { staff: true, leads: true, boothScans: true } } },
  });

  const shape = (b: (typeof booths)[number]) => ({
    id: b.id, name: b.name, boothNumber: b.boothNumber,
    onRoster: onList.has(b.name),
    staff: b._count.staff, leads: b._count.leads, scans: b._count.boothScans,
    detail: richness(b as unknown as BoothRow),
    has: {
      logo: !!b.logoUrl, website: !!b.website,
      categories: b.categories?.length ?? 0, description: !!b.description,
      sponsorTier: b.sponsorTier, lunchSponsor: b.isLunchSponsor, lotm: b.atLOTM,
    },
  });

  const pairs = await findPairs();
  const removedIds = new Set(pairs.map((p) => p.remove.id));
  const byId = new Map(booths.map((b) => [b.id, b]));

  const gaps = booths
    .filter((b) => !removedIds.has(b.id))
    .map((b) => ({
      id: b.id, name: b.name, onRoster: onList.has(b.name),
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
    duplicates: pairs
      .filter((p) => byId.has(p.keep.id) && byId.has(p.remove.id))
      .map((p) => ({
        keep: shape(byId.get(p.keep.id)!),
        remove: shape(byId.get(p.remove.id)!),
      })),
    notOnRoster: booths
      .filter((b) => !onList.has(b.name) && !removedIds.has(b.id))
      .map(shape),
    gaps,
    autoFillable: gaps.filter((g) => g.canAutoFill).length,
  });
  } catch (e) {
    // Without this the page just white-screens into the app's generic error box
    // and nothing reaches the logs.
    const message = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    console.error("booth-cleanup GET failed:", message);
    return NextResponse.json({ error: `Could not read the booths — ${message}` }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));

  try {
    if (body?.action === "MERGE") {
      const { keepId, removeId } = body;
      if (!keepId || !removeId || keepId === removeId) {
        return NextResponse.json({ error: "Need two different booths" }, { status: 400 });
      }
      const merged = await mergeOne(keepId, removeId);
      if (!merged) return NextResponse.json({ error: "Booth not found" }, { status: 404 });
      return NextResponse.json({ ok: true, merged });
    }

    if (body?.action === "MERGE_ALL") {
      const pairs = await findPairs();
      const merged = [];
      const failed: { pair: string; reason: string }[] = [];
      for (const p of pairs) {
        try {
          const r = await mergeOne(p.keep.id, p.remove.id);
          if (r) merged.push(r);
        } catch (e) {
          failed.push({
            pair: `${p.keep.name} + ${p.remove.name}`,
            reason: e instanceof Error ? e.message : "unknown",
          });
        }
      }
      return NextResponse.json({ ok: true, count: merged.length, merged, failed });
    }

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
  } catch (e) {
    // Surface the real reason instead of letting the page show a generic hiccup.
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
