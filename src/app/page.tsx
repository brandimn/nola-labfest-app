import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Users, Calendar, QrCode, Trophy, Bell, IdCard, Sparkles } from "lucide-react";
import { PushPrompt } from "@/components/push-prompt";

export default async function Home() {
  const user = await getUser();
  if (!user) redirect("/login");

  const [totalVendors, nextSession, myScans, totalSessions, announcements, myVote] = await Promise.all([
    prisma.vendor.count(),
    prisma.session.findFirst({
      where: { startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
    }),
    user.role === "ATTENDEE"
      ? prisma.boothScan.count({ where: { attendeeId: user.id } })
      : Promise.resolve(0),
    prisma.session.count(),
    prisma.announcement.findMany({ orderBy: { sentAt: "desc" }, take: 3 }),
    user.role === "ATTENDEE"
      ? prisma.boothVote.findUnique({
          where: { attendeeId: user.id },
          include: { vendor: { select: { name: true } } },
        })
      : Promise.resolve(null),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6">
        <img src="/nola-lockup.png" alt="NOLA LabFest — A Lab Innovation Summit" className="h-16 w-auto mb-2" />
        <h1 className="text-xl font-bold">Welcome, {user.name.split(" ")[0]}</h1>
      </header>

      <PushPrompt />

      {user.role === "ATTENDEE" && (
        <div className="rounded-xl p-4 mb-4 text-white shadow-sm bg-gradient-to-r from-[#3D1E50] via-[#B13E7D] to-[#F5A547]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Passport Progress</p>
              <p className="text-3xl font-bold drop-shadow">{myScans} / {totalVendors}</p>
              <p className="text-xs opacity-90">booths visited</p>
            </div>
            <Link href="/game" className="rounded-lg bg-white/25 backdrop-blur px-4 py-2 text-sm font-semibold hover:bg-white/35">
              Play →
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Tile href="/vendors" icon={Users} label="Vendors" sub={`${totalVendors} exhibitors`} />
        <Tile href="/schedule" icon={Calendar} label="Schedule" sub={`${totalSessions} sessions`} />
        {user.role === "ATTENDEE" && (
          <>
            <Tile href="/scan" icon={QrCode} label="Scan Booth" sub="Earn stamps" />
            <Tile href="/badge" icon={IdCard} label="My Badge" sub="Show to vendors" />
            <Tile
              href="/vote"
              icon={Sparkles}
              label="Vote"
              sub={myVote ? `You voted: ${myVote.vendor.name}` : "Best decorated booth"}
            />
          </>
        )}
        {user.role === "VENDOR" && (
          <>
            <Tile href="/vendor/scan" icon={QrCode} label="Scan Lead" sub="Capture contact" />
            <Tile href="/vendor/leads" icon={Trophy} label="My Leads" sub="View list" />
          </>
        )}
        {user.role === "ADMIN" && (
          <>
            <Tile href="/admin" icon={Trophy} label="Admin" sub="Dashboard" />
            <Tile href="/admin/announcements" icon={Bell} label="Announce" sub="Send push" />
          </>
        )}
      </div>

      {nextSession && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Up Next</h2>
          <Link href={`/schedule/${nextSession.id}`} className="card block p-4 hover:shadow-md transition">
            <p className="font-semibold">{nextSession.title}</p>
            {nextSession.speaker && <p className="text-sm text-slate-600">{nextSession.speaker}</p>}
            <p className="mt-1 text-xs text-slate-500">
              {new Date(nextSession.startsAt).toLocaleString("en-US", {
                weekday: "short", hour: "numeric", minute: "2-digit",
                timeZone: "America/New_York",
              })}
              {nextSession.location ? ` · ${nextSession.location}` : ""}
            </p>
          </Link>
        </section>
      )}

      {announcements.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Announcements</h2>
          <div className="space-y-2">
            {announcements.map((a) => (
              <div key={a.id} className="card p-3">
                <p className="font-medium">{a.title}</p>
                <p className="text-sm text-slate-600">{a.body}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {new Date(a.sentAt).toLocaleString("en-US", { timeZone: "America/New_York" })}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Tile({ href, icon: Icon, label, sub }: { href: string; icon: any; label: string; sub: string }) {
  return (
    <Link href={href} className="card p-4 hover:shadow-md transition active:scale-95">
      <Icon className="h-6 w-6 text-[#0F172A] mb-2" />
      <p className="font-semibold">{label}</p>
      <p className="text-xs text-slate-500">{sub}</p>
    </Link>
  );
}
