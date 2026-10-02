import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Tag, CalendarClock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PromosPage() {
  await requireUser();

  const promos = await prisma.promo.findMany({
    where: { active: true },
    orderBy: [{ createdAt: "desc" }],
    include: {
      vendor: { select: { id: true, name: true, boothNumber: true, logoUrl: true } },
    },
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-24">
      <section
        className="relative mb-5 overflow-hidden rounded-2xl px-5 py-6 text-white shadow-md"
        style={{ background: "linear-gradient(135deg, #3D1E50 0%, #B13E7D 55%, #F5A547 130%)" }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest opacity-85">Show Specials</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold">Promos &amp; Deals</h1>
        <p className="mt-1 text-sm italic opacity-90">
          Exclusive offers from our LabFest vendors. Laissez les bons deals rouler!
        </p>
      </section>

      {promos.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          <Tag className="mx-auto mb-2 h-6 w-6 text-slate-400" />
          <p className="font-medium">No promos posted yet.</p>
          <p className="mt-1 text-sm">Check back soon, our vendors are cooking some up.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {promos.map((p) => (
            <div key={p.id} className="card overflow-hidden">
              {p.imageUrl && (
                <a href={p.imageUrl} target="_blank" rel="noreferrer" className="block bg-slate-50">
                  <img
                    src={p.imageUrl}
                    alt=""
                    className="mx-auto max-h-[30rem] w-full object-contain"
                  />
                </a>
              )}
              <div className="p-4">
                <Link
                  href={`/vendors/${p.vendor.id}`}
                  className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#7C3AED]"
                >
                  {p.vendor.logoUrl ? (
                    <img
                      src={p.vendor.logoUrl}
                      alt=""
                      className="h-7 w-7 flex-shrink-0 rounded bg-white object-contain ring-1 ring-slate-200"
                    />
                  ) : (
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-[#7C3AED]/10">
                      <Tag className="h-4 w-4" />
                    </span>
                  )}
                  <span className="truncate">{p.vendor.name}</span>
                  {p.vendor.boothNumber && p.vendor.boothNumber !== "TBD" && (
                    <span className="ml-auto flex-shrink-0 text-[11px] font-normal text-slate-400">
                      Booth {p.vendor.boothNumber}
                    </span>
                  )}
                </Link>
                <p className="font-display text-lg font-bold leading-snug text-slate-900">{p.title}</p>
                {p.details && (
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{p.details}</p>
                )}
                {p.window && (
                  <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#F5A547]/15 px-2.5 py-1 text-xs font-semibold text-[#B45309]">
                    <CalendarClock className="h-3.5 w-3.5" /> {p.window}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
