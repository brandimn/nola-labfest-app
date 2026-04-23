import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { DrawingButton } from "@/components/drawing-button";

const THRESHOLD = 20;

export default async function AdminDrawingPage() {
  await requireRole("ADMIN");
  const totalVendors = await prisma.vendor.count();

  const counts = await prisma.boothScan.groupBy({
    by: ["attendeeId"],
    _count: { vendorId: true },
    having: { vendorId: { _count: { gte: THRESHOLD } } },
  });
  const eligibleIds = counts.map((c) => c.attendeeId);
  const eligible = await prisma.user.findMany({
    where: { id: { in: eligibleIds } },
    select: { id: true, name: true, company: true, email: true },
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/admin" className="text-sm text-[#0F172A]">← Admin</Link>
      <h1 className="mt-3 mb-2 text-2xl font-bold">Prize Drawing</h1>
      <p className="mb-4 text-sm text-slate-600">
        Eligibility: visited at least {THRESHOLD} of {totalVendors} booths.
      </p>
      <p className="mb-4 font-semibold">{eligible.length} eligible attendee{eligible.length === 1 ? "" : "s"}</p>
      <DrawingButton eligibleIds={eligible.map((e) => e.id)} />
      <ul className="mt-4 card divide-y">
        {eligible.map((e) => (
          <li key={e.id} className="p-3">
            <p className="font-medium">{e.name}</p>
            <p className="text-xs text-slate-500">{e.company ?? ""} {e.company && "·"} {e.email}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
