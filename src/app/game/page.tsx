import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Trophy } from "lucide-react";

const WIN_THRESHOLD = 20;

export default async function GamePage() {
  const user = await requireUser();

  const [vendors, myScans, leaderboardRaw] = await Promise.all([
    prisma.vendor.findMany({ orderBy: { boothNumber: "asc" } }),
    prisma.boothScan.findMany({
      where: { attendeeId: user.id },
      select: { vendorId: true },
    }),
    prisma.boothScan.groupBy({
      by: ["attendeeId"],
      _count: { vendorId: true },
      orderBy: { _count: { vendorId: "desc" } },
      take: 10,
    }),
  ]);

  const visited = new Set(myScans.map((s) => s.vendorId));
  const total = vendors.length;
  const pct = total === 0 ? 0 : Math.round((myScans.length / total) * 100);

  const leaderUserIds = leaderboardRaw.map((r) => r.attendeeId);
  const leaderUsers = await prisma.user.findMany({
    where: { id: { in: leaderUserIds } },
    select: { id: true, name: true, company: true },
  });
  const userById = Object.fromEntries(leaderUsers.map((u) => [u.id, u]));
  const leaders = leaderboardRaw.map((r) => ({
    user: userById[r.attendeeId],
    count: r._count.vendorId,
  }));

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Passport Game</h1>

      <div className="card p-5 mb-4 bg-gradient-to-br from-[#0F172A] to-[#1F2937] text-white">
        <p className="text-sm opacity-90">Your progress</p>
        <p className="text-4xl font-bold">{myScans.length} / {total}</p>
        <div className="mt-3 h-2 w-full rounded-full bg-white/20 overflow-hidden">
          <div className="h-full bg-white transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-3 text-sm">
          {myScans.length >= WIN_THRESHOLD
            ? "🎉 You're entered in the prize drawing!"
            : `Visit ${WIN_THRESHOLD - myScans.length} more to be entered in the prize drawing`}
        </p>
      </div>

      <Link href="/scan" className="btn-primary w-full mb-6">Scan a Booth</Link>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Stamps</h2>
        <div className="grid grid-cols-4 gap-2">
          {vendors.map((v) => {
            const got = visited.has(v.id);
            return (
              <div
                key={v.id}
                className={`aspect-square rounded-lg border-2 p-2 flex flex-col items-center justify-center text-center ${
                  got ? "border-[#0F172A] bg-[#0F172A]/10" : "border-dashed border-slate-300 bg-slate-50"
                }`}
              >
                <p className={`text-xs font-semibold ${got ? "text-[#0F172A]" : "text-slate-400"}`}>
                  {got ? "✓" : "?"}
                </p>
                <p className={`text-[10px] leading-tight truncate w-full ${got ? "" : "text-slate-400"}`}>
                  {got ? v.name : "locked"}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <Trophy className="h-4 w-4" /> Leaderboard
        </h2>
        {leaders.length === 0 ? (
          <p className="text-sm text-slate-500">No scans yet. Be the first!</p>
        ) : (
          <ol className="card divide-y divide-slate-100">
            {leaders.map((l, i) => (
              <li key={l.user?.id ?? i} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center font-bold text-slate-400">{i + 1}</span>
                  <div>
                    <p className="font-medium">{l.user?.name ?? "?"}</p>
                    {l.user?.company && <p className="text-xs text-slate-500">{l.user.company}</p>}
                  </div>
                </div>
                <span className="font-semibold text-[#0F172A]">{l.count}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
