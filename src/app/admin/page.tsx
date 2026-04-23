import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Users, Store, Calendar, Bell, Trophy, Scan, Sparkles, Printer, Settings } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AdminHome() {
  const me = await requireRole("ADMIN");
  const [attendees, vendors, sessions, scansToday, subs, topBoothsRaw] = await Promise.all([
    prisma.user.count({ where: { role: "ATTENDEE" } }),
    prisma.vendor.count(),
    prisma.session.count(),
    prisma.boothScan.count({
      where: { scannedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
    prisma.pushSubscription.count(),
    prisma.boothScan.groupBy({
      by: ["vendorId"],
      _count: { attendeeId: true },
      orderBy: { _count: { attendeeId: "desc" } },
      take: 5,
    }),
  ]);
  const topVendors = await prisma.vendor.findMany({
    where: { id: { in: topBoothsRaw.map((t) => t.vendorId) } },
    select: { id: true, name: true },
  });
  const vendorById = Object.fromEntries(topVendors.map((v) => [v.id, v]));

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-slate-600">Signed in as {me.name}</p>
        </div>
        <SignOutButton compact />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <Stat label="Attendees" value={attendees} />
        <Stat label="Vendors" value={vendors} />
        <Stat label="Sessions" value={sessions} />
        <Stat label="Scans (24h)" value={scansToday} />
        <Stat label="Push subs" value={subs} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <AdminTile href="/admin/vendors" icon={Store} label="Vendors" />
        <AdminTile href="/admin/schedule" icon={Calendar} label="Schedule" />
        <AdminTile href="/admin/users" icon={Users} label="Users" />
        <AdminTile href="/admin/announcements" icon={Bell} label="Announcements" />
        <AdminTile href="/admin/drawing" icon={Trophy} label="Prize Drawing" />
        <AdminTile href="/admin/leads" icon={Scan} label="All Leads" />
        <AdminTile href="/admin/voting" icon={Sparkles} label="Booth Voting" />
        <AdminTile href="/admin/badges" icon={Printer} label="Print Badges" />
        <AdminTile href="/admin/settings" icon={Settings} label="Settings" />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Top booths</h2>
        {topBoothsRaw.length === 0 ? (
          <p className="text-sm text-slate-500">No scans yet.</p>
        ) : (
          <ol className="card divide-y">
            {topBoothsRaw.map((b, i) => (
              <li key={b.vendorId} className="p-3 flex justify-between">
                <span>{i + 1}. {vendorById[b.vendorId]?.name ?? "?"}</span>
                <span className="font-semibold">{b._count.attendeeId} visits</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function AdminTile({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Link href={href} className="card p-4 hover:shadow-md transition flex items-center gap-3">
      <Icon className="h-5 w-5 text-[#0F172A]" />
      <span className="font-medium">{label}</span>
    </Link>
  );
}
