import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export default async function AdminVendorsPage() {
  await requireRole("ADMIN");
  const vendors = await prisma.vendor.findMany({ orderBy: { name: "asc" } });
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Vendors ({vendors.length})</h1>
        <Link href="/admin/vendors/new" className="btn-primary text-sm">+ New</Link>
      </div>
      <ul className="space-y-2">
        {vendors.map((v) => (
          <li key={v.id}>
            <Link href={`/admin/vendors/${v.id}`} className="card flex justify-between p-3 hover:shadow-md">
              <div>
                <p className="font-semibold">{v.name}</p>
                <p className="text-xs text-slate-500">Booth {v.boothNumber}{v.category ? ` · ${v.category}` : ""}</p>
              </div>
              <span className="text-xs text-slate-400 self-center">Edit →</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
