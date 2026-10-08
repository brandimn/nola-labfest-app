import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Maximize2 } from "lucide-react";
import { ImageLightbox } from "@/components/image-lightbox";

export const dynamic = "force-dynamic";

export default async function FloorMapPage() {
  await requireUser();
  const vendors = await prisma.vendor.findMany({
    where: { boothNumber: { notIn: ["TBD", "No booth", ""] } },
    select: { id: true, name: true, boothNumber: true },
  });
  vendors.sort((a, b) => (parseInt(a.boothNumber) || 999) - (parseInt(b.boothNumber) || 999));

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-24">
      <h1 className="font-display text-4xl font-extrabold gradient-text">Floor Map</h1>
      <p className="mb-4 mt-1 text-sm text-slate-600">
        Find your way around the vendor hall. Tap the map to open it full size and zoom in.
      </p>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <ImageLightbox
          src="/floor-map.png"
          alt="NOLA LabFest vendor floor map"
          thumbClassName="w-full cursor-zoom-in"
        />
      </div>
      <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500">
        <Maximize2 className="h-4 w-4" /> Tap the map to zoom in
      </p>

      {vendors.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Booths by number
          </h2>
          <div className="grid grid-cols-2 gap-x-5 gap-y-0.5 text-sm sm:grid-cols-3">
            {vendors.map((v) => (
              <Link
                key={v.id}
                href={`/vendors/${v.id}`}
                className="flex items-baseline gap-2 py-1 hover:text-[#7C3AED]"
              >
                <span className="w-6 flex-shrink-0 text-right font-bold text-slate-400">{v.boothNumber}</span>
                <span className="truncate">{v.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
