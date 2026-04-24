import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { VendorSearch } from "@/components/vendor-search";
import { SponsorTier } from "@/components/sponsor-tier";
import { EventFilter } from "@/components/event-filter";

const TIER_ORDER: Record<string, number> = { PLATINUM: 0, GOLD: 1, SILVER: 2, BRONZE: 3 };

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; event?: string };
}) {
  await requireUser();
  const q = searchParams.q?.trim();
  const category = searchParams.category?.trim();
  const eventFilter = searchParams.event?.trim(); // "labfest" | "lotm" | undefined (all)

  const eventWhere =
    eventFilter === "labfest"
      ? { atLabFest: true }
      : eventFilter === "lotm"
        ? { atLOTM: true }
        : {};

  const vendorsRaw = await prisma.vendor.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
                { category: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
        category ? { category } : {},
        eventWhere,
      ],
    },
    orderBy: { name: "asc" },
  });
  const vendors = [...vendorsRaw].sort((a, b) => {
    const ta = a.sponsorTier ? TIER_ORDER[a.sponsorTier] ?? 99 : 99;
    const tb = b.sponsorTier ? TIER_ORDER[b.sponsorTier] ?? 99 : 99;
    if (ta !== tb) return ta - tb;
    return a.name.localeCompare(b.name);
  });

  const categoriesRaw = await prisma.vendor.findMany({
    where: { category: { not: null } },
    select: { category: true },
    distinct: ["category"],
  });
  const categories = categoriesRaw.map((c) => c.category!).filter(Boolean).sort();

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-2 font-display text-3xl font-bold">Vendors</h1>
      <EventFilter current={eventFilter} />
      <VendorSearch categories={categories} />
      {vendors.length === 0 ? (
        <p className="mt-6 text-center text-slate-500">No vendors match your search.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {vendors.map((v) => (
            <li key={v.id}>
              <Link
                href={`/vendors/${v.id}`}
                className="card flex items-center gap-3 p-3 hover:shadow-md transition"
              >
                <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
                  {v.logoUrl ? (
                    <img src={v.logoUrl} alt={v.name} className="h-full w-full object-contain" />
                  ) : (
                    <span className="font-bold text-slate-400">{v.name[0]}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold truncate">{v.name}</p>
                    <SponsorTier tier={v.sponsorTier} />
                    {v.atLOTM && (
                      <span className="rounded-full bg-[#FF5DA2] text-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                        LOTM
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    Booth {v.boothNumber}
                    {v.category ? ` · ${v.category}` : ""}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
