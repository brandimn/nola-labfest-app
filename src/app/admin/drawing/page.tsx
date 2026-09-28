import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { DrawingButton } from "@/components/drawing-button";
import { SettingTextForm } from "@/components/setting-text-form";
import { resolveThreshold, defaultThreshold } from "@/lib/drawing";

export const dynamic = "force-dynamic";

export default async function AdminDrawingPage() {
  await requireRole("ADMIN");
  const [totalVendors, override] = await Promise.all([
    prisma.vendor.count(),
    prisma.setting.findUnique({ where: { key: "drawingThreshold" } }),
  ]);
  const threshold = resolveThreshold(totalVendors, override?.value);

  const counts = await prisma.boothScan.groupBy({
    by: ["attendeeId"],
    _count: { vendorId: true },
    having: { vendorId: { _count: { gte: threshold } } },
  });
  const eligibleIds = counts.map((c) => c.attendeeId);
  const eligible = await prisma.user.findMany({
    where: { id: { in: eligibleIds } },
    select: { id: true, name: true, company: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/admin" className="text-sm text-[#0F172A]">← Admin</Link>
      <h1 className="mt-3 mb-2 text-2xl font-bold">Prize Drawing</h1>
      <p className="mb-1 text-sm text-slate-600">
        Anyone who visited at least <b>{threshold}</b> booths is entered. We&rsquo;ll draw{" "}
        <b>3 winners</b> at random.
      </p>

      <div className="my-4 rounded-lg border border-slate-200 bg-white p-3">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Booths required to be entered
        </label>
        <SettingTextForm
          settingKey="drawingThreshold"
          initialValue={override?.value ?? ""}
          placeholder={`Default: ${defaultThreshold(totalVendors)} (90% of ${totalVendors})`}
          buttonLabel="Set"
        />
        <p className="mt-1 text-xs text-slate-500">
          Leave blank to auto-use 90% of the {totalVendors} booths ({defaultThreshold(totalVendors)}).
          Set a specific number if some of those aren&rsquo;t real scannable booths.
        </p>
      </div>

      <p className="mb-3 font-semibold">
        {eligible.length} eligible attendee{eligible.length === 1 ? "" : "s"}
      </p>
      <DrawingButton eligibleIds={eligible.map((e) => e.id)} />

      <ul className="mt-4 card divide-y">
        {eligible.map((e) => (
          <li key={e.id} className="p-3">
            <p className="font-medium">{e.name}</p>
            <p className="text-xs text-slate-500">
              {e.company ? `${e.company} · ` : ""}
              {e.email}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
