import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { VendorSearch } from "@/components/vendor-search";

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string };
}) {
  await requireUser();
  const q = searchParams.q?.trim();
  const category = searchParams.category?.trim();

  const vendors = await prisma.vendor.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { name: { contains: q } },
                { description: { contains: q } },
                { category: { contains: q } },
              ],
            }
          : {},
        category ? { category } : {},
      ],
    },
    orderBy: { name: "asc" },
  });

  const categoriesRaw = await prisma.vendor.findMany({
    where: { category: { not: null } },
    select: { category: true },
    distinct: ["category"],
  });
  const categories = categoriesRaw.map((c) => c.category!).filter(Boolean).sort();

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Vendors</h1>
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
                  <p className="font-semibold truncate">{v.name}</p>
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
