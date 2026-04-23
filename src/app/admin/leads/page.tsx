import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export default async function AdminLeadsPage() {
  await requireRole("ADMIN");
  const leadsByVendor = await prisma.lead.groupBy({
    by: ["vendorId"],
    _count: { attendeeId: true },
    orderBy: { _count: { attendeeId: "desc" } },
  });
  const vendors = await prisma.vendor.findMany({
    where: { id: { in: leadsByVendor.map((l) => l.vendorId) } },
  });
  const vById = Object.fromEntries(vendors.map((v) => [v.id, v]));

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/admin" className="text-sm text-[#0F172A]">← Admin</Link>
      <h1 className="mt-3 mb-4 text-2xl font-bold">Leads by Vendor</h1>
      {leadsByVendor.length === 0 ? (
        <p className="text-slate-500">No leads captured yet.</p>
      ) : (
        <ul className="card divide-y">
          {leadsByVendor.map((l) => (
            <li key={l.vendorId} className="p-3 flex justify-between">
              <span>{vById[l.vendorId]?.name}</span>
              <span className="font-semibold">{l._count.attendeeId}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
