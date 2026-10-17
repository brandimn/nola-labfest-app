import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { DrawingButton } from "@/components/drawing-button";
import { SettingTextForm } from "@/components/setting-text-form";
import { resolveThreshold, defaultThreshold } from "@/lib/drawing";

export const dynamic = "force-dynamic";

export default async function AdminDrawingPage({
  searchParams,
}: {
  searchParams: { threshold?: string };
}) {
  await requireRole("ADMIN");
  const [totalVendors, override] = await Promise.all([
    prisma.vendor.count(),
    prisma.setting.findUnique({ where: { key: "drawingThreshold" } }),
  ]);
  const saved = resolveThreshold(totalVendors, override?.value);
  // Clicking one of the counts below looks at that cut off without committing
  // to it, so several can be compared before one is set for good.
  const peek = Number.parseInt(searchParams.threshold ?? "", 10);
  const previewing = Number.isFinite(peek) && peek > 0 && peek !== saved;
  const threshold = previewing ? peek : saved;

  const counts = await prisma.boothScan.groupBy({
    by: ["attendeeId"],
    _count: { vendorId: true },
    having: { vendorId: { _count: { gte: threshold } } },
  });
  const eligibleIds = counts.map((c) => c.attendeeId);

  // How far people actually got. Without this the threshold is a guess, and a
  // guess set too high shows an empty drawing with nothing explaining why.
  const allCounts = await prisma.boothScan.groupBy({
    by: ["attendeeId"],
    _count: { vendorId: true },
  });
  const scanned = allCounts.map((c) => c._count.vendorId).sort((a, b) => b - a);
  const best = scanned[0] ?? 0;
  // What each cut off would actually give, so a number can be picked on sight.
  const steps = Array.from(new Set([threshold, 20, 15, 12, 10, 8, 5, 3, 1]))
    .filter((n) => n > 0 && n <= Math.max(best, 1))
    .sort((a, b) => b - a)
    .map((n) => ({ n, people: scanned.filter((c) => c >= n).length }));
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

      <div className="my-4 rounded-lg border border-slate-200 bg-white p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          How many booths people actually visited
        </p>
        {scanned.length === 0 ? (
          <p className="text-sm text-slate-600">
            Nobody has scanned a booth yet, so there is nobody to draw from at any number.
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              {scanned.length} {scanned.length === 1 ? "person has" : "people have"} scanned at
              least one booth. The most anybody managed is <b>{best}</b>.
            </p>
            <p className="mt-1 text-xs text-slate-500">Tap one to see who it would enter.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {steps.map((s) => (
                <a
                  key={s.n}
                  href={`?threshold=${s.n}`}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                    s.n === threshold
                      ? "bg-[#7C3AED] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s.n}+ booths: {s.people}
                </a>
              ))}
            </div>
          </>
        )}
      </div>

      {previewing && (
        <p className="mb-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">
          Looking at <b>{threshold}+ booths</b>. Nothing is saved, and drawing now draws
          from this list.{" "}
          <a href="?" className="font-semibold underline">
            Back to the saved number ({saved})
          </a>
        </p>
      )}

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
