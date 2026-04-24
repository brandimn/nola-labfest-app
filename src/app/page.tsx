import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  Users,
  Calendar,
  QrCode,
  Trophy,
  Bell,
  IdCard,
  Sparkles,
  Mic,
  MapPin,
} from "lucide-react";
import { PushPrompt } from "@/components/push-prompt";
import { Countdown } from "@/components/countdown";
import { SponsorTier } from "@/components/sponsor-tier";

const EVENT_START_ISO = "2026-10-15T08:00:00-05:00";
const EVENT_LABEL = "October 15–17, 2026 · New Orleans";

export default async function Home() {
  const user = await getUser();
  if (!user) redirect("/login");

  const [
    totalVendors,
    nextSession,
    myScans,
    totalSessions,
    announcements,
    myVote,
    platinumSponsors,
    totalSpeakers,
  ] = await Promise.all([
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
    prisma.vendor.findMany({
      where: { sponsorTier: { in: ["PLATINUM", "GOLD"] } },
      orderBy: [{ sponsorTier: "asc" }, { name: "asc" }],
      select: { id: true, name: true, boothNumber: true, sponsorTier: true, category: true },
      take: 6,
    }),
    prisma.speaker.count(),
  ]);

  return (
    <main className="mx-auto max-w-2xl pb-6">
      <section
        className="relative overflow-hidden rounded-b-3xl px-5 pt-6 pb-8 text-white shadow-md"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(15,23,42,0.85), rgba(61,30,80,0.85) 35%, rgba(177,62,125,0.75) 65%, rgba(245,165,71,0.75)), url('/nola-hero.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <img src="/nola-lockup.png" alt="NOLA LabFest" className="h-14 w-auto brightness-0 invert" />
          <span className="rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[10px] uppercase tracking-wider font-semibold">
            Hi, {user.name.split(" ")[0]}
          </span>
        </div>
        <p className="mt-3 text-xs italic opacity-90">with a New Orleans twist</p>
        <p className="mt-4 text-[11px] uppercase tracking-widest opacity-80">{EVENT_LABEL}</p>
        <div className="mt-1">
          <Countdown iso={EVENT_START_ISO} />
        </div>
      </section>

      <div className="px-4 -mt-4 relative z-10">
        <PushPrompt />

        {user.role === "ATTENDEE" && (
          <div className="rounded-xl p-4 mb-4 text-white shadow-md bg-gradient-to-r from-[#3D1E50] via-[#B13E7D] to-[#F5A547]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider opacity-90">Passport Progress</p>
                <p className="font-display text-3xl font-bold drop-shadow">
                  {myScans} <span className="text-xl opacity-80">/ {totalVendors}</span>
                </p>
                <p className="text-xs opacity-90">booths visited</p>
              </div>
              <Link
                href="/game"
                className="rounded-lg bg-white/25 backdrop-blur px-4 py-2 text-sm font-semibold hover:bg-white/35"
              >
                Play →
              </Link>
            </div>
          </div>
        )}

        <Link
          href="/lotm"
          className="relative block rounded-xl p-4 mb-4 text-white shadow-md overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #0F172A 0%, #C7377A 45%, #FF5DA2 100%)",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest opacity-85 font-semibold">
                Thursday Kickoff · Oct 15
              </p>
              <p className="mt-1 font-display text-xl font-bold">Ladies of the Mill</p>
              <p className="mt-0.5 text-xs italic opacity-90">
                Ready to be inspired?
              </p>
            </div>
            <span className="rounded-lg bg-white/25 backdrop-blur px-4 py-2 text-sm font-semibold hover:bg-white/35 flex-shrink-0">
              Enter →
            </span>
          </div>
        </Link>

        <Link
          href="/after-hours"
          className="relative block rounded-xl p-4 mb-4 text-white shadow-md overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #5B2A86 0%, #0E8C4B 55%, #F5A547 100%)",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest opacity-85 font-semibold">
                After Hours · Fri + Sat Nights
              </p>
              <p className="mt-1 font-display text-xl font-bold">
                Let the good times roll
              </p>
              <p className="mt-0.5 text-xs italic opacity-90">
                Distillery tour · Masquerade party
              </p>
            </div>
            <span className="rounded-lg bg-white/25 backdrop-blur px-4 py-2 text-sm font-semibold hover:bg-white/35 flex-shrink-0">
              See →
            </span>
          </div>
        </Link>

        {nextSession && (
          <section className="mb-4">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Up next
            </h2>
            <Link
              href={`/schedule/${nextSession.id}`}
              className="card block p-4 hover:shadow-md transition"
            >
              <p className="font-display text-lg font-bold leading-tight">{nextSession.title}</p>
              {nextSession.speaker && (
                <p className="text-sm text-[#B13E7D] font-semibold">{nextSession.speaker}</p>
              )}
              <p className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(nextSession.startsAt).toLocaleString("en-US", {
                    weekday: "short",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "America/New_York",
                  })}
                </span>
                {nextSession.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {nextSession.location}
                  </span>
                )}
              </p>
            </Link>
          </section>
        )}

        <div className="grid grid-cols-3 gap-2 mb-6">
          <Tile href="/vendors" icon={Users} label="Vendors" />
          <Tile href="/schedule" icon={Calendar} label="Schedule" />
          <Tile href="/speakers" icon={Mic} label="Speakers" />
          {user.role === "ATTENDEE" && (
            <>
              <Tile href="/scan" icon={QrCode} label="Scan Booth" />
              <Tile href="/badge" icon={IdCard} label="My Badge" />
              <Tile
                href="/vote"
                icon={Sparkles}
                label="Vote"
                accent={myVote ? true : false}
              />
            </>
          )}
          {user.role === "VENDOR" && (
            <>
              <Tile href="/vendor/scan" icon={QrCode} label="Scan Lead" />
              <Tile href="/vendor/leads" icon={Trophy} label="My Leads" />
            </>
          )}
          {user.role === "ADMIN" && (
            <>
              <Tile href="/admin" icon={Trophy} label="Admin" />
              <Tile href="/admin/announcements" icon={Bell} label="Announce" />
            </>
          )}
        </div>

        {platinumSponsors.length > 0 && (
          <section className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Our sponsors
              </h2>
              <Link href="/vendors" className="text-xs font-medium text-[#B13E7D]">
                See all →
              </Link>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
              {platinumSponsors.map((s) => (
                <Link
                  key={s.id}
                  href={`/vendors/${s.id}`}
                  className="card min-w-[180px] snap-start p-3 hover:shadow-md transition"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-semibold">
                      Booth {s.boothNumber}
                    </span>
                    <SponsorTier tier={s.sponsorTier} />
                  </div>
                  <p className="font-display text-base font-bold leading-tight">{s.name}</p>
                  {s.category && (
                    <p className="text-[11px] text-slate-500 mt-1">{s.category}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {announcements.length > 0 && (
          <section>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Announcements
            </h2>
            <div className="space-y-2">
              {announcements.map((a) => (
                <div key={a.id} className="card p-3">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-sm text-slate-600">{a.body}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(a.sentAt).toLocaleString("en-US", {
                      timeZone: "America/New_York",
                    })}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Tile({
  href,
  icon: Icon,
  label,
  accent,
}: {
  href: string;
  icon: any;
  label: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`card flex flex-col items-center justify-center p-3 text-center hover:shadow-md transition active:scale-95 ${
        accent ? "ring-2 ring-[#B13E7D]/40" : ""
      }`}
    >
      <Icon className={`h-5 w-5 mb-1 ${accent ? "text-[#B13E7D]" : "text-[#0F172A]"}`} />
      <p className="text-xs font-semibold">{label}</p>
    </Link>
  );
}
