import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { GalleryExport } from "@/components/gallery-export";

export const dynamic = "force-dynamic";

export default async function AdminGalleryPage() {
  await requireRole("ADMIN");
  const [count, posters] = await Promise.all([
    prisma.galleryPhoto.count(),
    prisma.galleryPhoto.groupBy({ by: ["uploaderName"], _count: { _all: true } }),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/admin" className="text-sm text-slate-500">← Admin</Link>
      <h1 className="mb-1 mt-3 font-display text-2xl font-bold">Gallery photos</h1>
      <p className="mb-4 text-sm text-slate-600">
        {count} {count === 1 ? "photo" : "photos"} from {posters.length}{" "}
        {posters.length === 1 ? "person" : "people"}.
      </p>

      <GalleryExport count={count} />

      <p className="mt-4 text-xs text-slate-500">
        The zip holds every photo at the size it was posted, named in the order they
        went up, plus a spreadsheet listing who posted each one and their caption.
        It is built on this device, so it works however many there are, but it does
        take a minute for a large gallery.
      </p>

      <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wider text-slate-500">
        Who posted
      </h2>
      <ul className="card divide-y">
        {[...posters]
          .sort((a, b) => b._count._all - a._count._all)
          .map((p) => (
            <li key={p.uploaderName} className="flex justify-between p-3 text-sm">
              <span>{p.uploaderName}</span>
              <span className="font-semibold">{p._count._all}</span>
            </li>
          ))}
      </ul>
    </main>
  );
}
