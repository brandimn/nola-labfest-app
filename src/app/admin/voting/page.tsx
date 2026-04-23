import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export default async function AdminVotingPage() {
  await requireRole("ADMIN");

  const [votesByVendor, vendors, totalVotes, totalAttendees] = await Promise.all([
    prisma.boothVote.groupBy({
      by: ["vendorId"],
      _count: { attendeeId: true },
      orderBy: { _count: { attendeeId: "desc" } },
    }),
    prisma.vendor.findMany({
      orderBy: { boothNumber: "asc" },
      select: { id: true, name: true, boothNumber: true },
    }),
    prisma.boothVote.count(),
    prisma.user.count({ where: { role: "ATTENDEE" } }),
  ]);

  const vendorById = Object.fromEntries(vendors.map((v) => [v.id, v]));
  const topCount = votesByVendor[0]?._count.attendeeId ?? 0;

  const rows = vendors.map((v) => {
    const match = votesByVendor.find((r) => r.vendorId === v.id);
    const count = match?._count.attendeeId ?? 0;
    return { ...v, count };
  });
  rows.sort((a, b) => b.count - a.count || a.boothNumber.localeCompare(b.boothNumber));

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold">Best Decorated Booth — Results</h1>
      <p className="mb-4 text-sm text-slate-600">
        {totalVotes} of {totalAttendees} attendees have voted.
      </p>

      <ol className="card divide-y">
        {rows.map((v, i) => {
          const pct = totalVotes === 0 ? 0 : Math.round((v.count / totalVotes) * 100);
          const isLeader = v.count > 0 && v.count === topCount;
          return (
            <li key={v.id} className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 text-right text-sm font-semibold text-slate-500">
                    {i + 1}.
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">
                      {v.name}{" "}
                      {isLeader && (
                        <span className="ml-1 text-xs rounded bg-[#FFB81C] px-1.5 py-0.5 font-bold text-slate-900">
                          LEADER
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">Booth {v.boothNumber}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{v.count}</p>
                  <p className="text-xs text-slate-500">{pct}%</p>
                </div>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={
                    isLeader
                      ? "h-full bg-gradient-to-r from-[#3D1E50] via-[#B13E7D] to-[#F5A547]"
                      : "h-full bg-slate-400"
                  }
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
