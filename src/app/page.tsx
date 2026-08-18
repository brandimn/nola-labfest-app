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
  UsersRound,
  Images,
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
      where: { startsAt: { gte: new Date() }, event: "LABFEST" },
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

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { vendorId: true, ownedVendor: { select: { id: true } }, ownedSpeaker: { select: { id: true } } },
  });
  const hasBooth = !!(me?.vendorId || me?.ownedVendor);
  const isSpeaker = !!me?.ownedSpeaker;

  const [vendorPacketUrl, speakerPacketUrl] = await Promise.all([
    hasBooth
      ? prisma.setting.findUnique({ where: { key: "vendorPacketUrl" } }).then((r) => r?.value || "")
      : Promise.resolve(""),
    isSpeaker
      ? prisma.setting.findUnique({ where: { key: "speakerPacketUrl" } }).then((r) => r?.value || "")
      : Promise.resolve(""),
  ]);

  const tileSettings = await prisma.setting.findMany({
    where: { key: { startsWith: "tileImg:" } },
  });
  const tileImg: Record<string, string> = Object.fromEntries(
    tileSettings.map((s) => [s.key.replace("tileImg:", ""), s.value])
  );

  return (
    <main className="mx-auto max-w-2xl pb-6">
      <section
        className="relative overflow-hidden rounded-b-3xl px-5 pt-6 pb-8 text-white shadow-md"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(15,23,42,0.7) 0%, rgba(15,23,42,0.28) 45%, rgba(15,23,42,0.62) 100%), url('/nola-hero-2.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="flex justify-end">
          <span className="rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[10px] uppercase tracking-wider font-semibold">
            Hi, {user.name.split(" ")[0]}
          </span>
        </div>
        <div className="mt-1 flex flex-col items-center text-center">
          <img
            src="/nowak-logo-white.png"
            alt="Nowak Dental Supplies"
            className="mb-3 h-auto w-full max-w-[190px] drop-shadow"
          />
          <img
            src="/nola-lockup.png"
            alt="NOLA LabFest"
            className="h-auto w-full max-w-[300px] brightness-0 invert drop-shadow-md sm:max-w-[360px]"
          />
          <p className="mt-2 text-sm italic opacity-90">with a New Orleans twist</p>
          <p className="mt-3 font-display text-2xl font-extrabold uppercase tracking-tight drop-shadow sm:text-3xl">
            🤓 Lab Nerds Unite
          </p>
        </div>
        <p className="mt-4 text-center text-[11px] uppercase tracking-widest opacity-80">{EVENT_LABEL}</p>
        <div className="mt-1 flex justify-center">
          <Countdown iso={EVENT_START_ISO} />
        </div>
      </section>

      <div className="px-4 -mt-4 relative z-10">
        <PushPrompt />

        {hasBooth &&
          (vendorPacketUrl ? (
            <a
              href={vendorPacketUrl}
              target="_blank"
              rel="noreferrer"
              className="relative mb-4 block overflow-hidden rounded-xl p-4 text-white shadow-md"
              style={{ background: "linear-gradient(135deg, #0057A3 0%, #7C3AED 100%)" }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest opacity-85">
                    Got questions?
                  </p>
                  <p className="mt-1 font-display text-xl font-bold">Your Vendor Packet</p>
                  <p className="mt-0.5 text-xs italic opacity-90">
                    Everything you need for the show
                  </p>
                </div>
                <span className="flex-shrink-0 rounded-lg bg-white/25 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/35">
                  Open →
                </span>
              </div>
            </a>
          ) : (
            <div
              className="relative mb-4 block overflow-hidden rounded-xl p-4 text-white shadow-md"
              style={{ background: "linear-gradient(135deg, #0057A3 0%, #7C3AED 100%)" }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest opacity-85">
                Got questions?
              </p>
              <p className="mt-1 font-display text-xl font-bold">Your Vendor Packet</p>
              <p className="mt-0.5 text-xs italic opacity-90">Coming soon — check back shortly.</p>
            </div>
          ))}

        {isSpeaker &&
          (speakerPacketUrl ? (
            <a
              href={speakerPacketUrl}
              target="_blank"
              rel="noreferrer"
              className="relative mb-4 block overflow-hidden rounded-xl p-4 text-white shadow-md"
              style={{ background: "linear-gradient(135deg, #3D1E50 0%, #B13E7D 100%)" }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest opacity-85">
                    Speaking with us?
                  </p>
                  <p className="mt-1 font-display text-xl font-bold">Your Speaker Packet</p>
                  <p className="mt-0.5 text-xs italic opacity-90">
                    Everything you need for your session
                  </p>
                </div>
                <span className="flex-shrink-0 rounded-lg bg-white/25 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/35">
                  Open →
                </span>
              </div>
            </a>
          ) : (
            <div
              className="relative mb-4 block overflow-hidden rounded-xl p-4 text-white shadow-md"
              style={{ background: "linear-gradient(135deg, #3D1E50 0%, #B13E7D 100%)" }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest opacity-85">
                Speaking with us?
              </p>
              <p className="mt-1 font-display text-xl font-bold">Your Speaker Packet</p>
              <p className="mt-0.5 text-xs italic opacity-90">Coming soon, check back shortly.</p>
            </div>
          ))}

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
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[#7C3AED]">
              🎤 Up next
            </h2>
            <Link
              href={`/schedule/${nextSession.id}`}
              className="block rounded-xl p-4 text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
              style={{ backgroundImage: "linear-gradient(135deg, #7C3AED 0%, #B13E7D 55%, #F5A547 135%)" }}
            >
              <p className="font-display text-lg font-bold leading-tight">{nextSession.title}</p>
              {nextSession.speaker && (
                <p className="text-sm font-semibold text-white/90">{nextSession.speaker}</p>
              )}
              <p className="mt-1 flex items-center gap-3 text-xs text-white/85">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(nextSession.startsAt).toLocaleString("en-US", {
                    weekday: "short",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "America/Chicago",
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
          <Tile href="/vendors" icon={Users} label="Vendors" color="#7C3AED" image={tileImg.vendors} />
          <Tile href="/schedule" icon={Calendar} label="Schedule" color="#0EA5E9" image={tileImg.schedule} />
          <Tile href="/speakers" icon={Mic} label="Speakers" color="#B13E7D" image={tileImg.speakers} />
          <Tile href="/team" icon={UsersRound} label="Nowak Team" color="#0057A3" image={tileImg.team} />
          <Tile href="/gallery" icon={Images} label="Photo Gallery" color="#DB2777" image={tileImg.gallery} />
          {user.role === "ATTENDEE" && (
            <>
              <Tile href="/scan" icon={QrCode} label="Scan Booth" color="#0E8C4B" image={tileImg.scan} />
              <Tile href="/badge" icon={IdCard} label="My Badge" color="#F59E0B" image={tileImg.badge} />
              <Tile href="/vote" icon={Sparkles} label="Vote" color="#EC4899" accent={!!myVote} image={tileImg.vote} />
            </>
          )}
          {user.role === "VENDOR" && (
            <>
              <Tile href="/vendor/scan" icon={QrCode} label="Scan Lead" color="#0E8C4B" />
              <Tile href="/vendor/leads" icon={Trophy} label="My Leads" color="#F59E0B" />
            </>
          )}
          {user.role === "ADMIN" && (
            <>
              <Tile href="/admin" icon={Trophy} label="Admin" color="#F59E0B" />
              <Tile href="/admin/announcements" icon={Bell} label="Announce" color="#7C3AED" />
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
                      timeZone: "America/Chicago",
                    })}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-8">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
            <div className="h-1.5 festive-bar" />
            <div className="flex flex-col items-center gap-2 px-5 py-6 text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#0057A3]">
                Proudly presented by
              </p>
              <img
                src="/nowak-dental-logo.png"
                alt="Nowak Dental Supplies"
                className="h-auto w-full max-w-[260px]"
              />
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

function Tile({
  href,
  icon: Icon,
  label,
  color = "#7C3AED",
  accent,
  image,
}: {
  href: string;
  icon: any;
  label: string;
  color?: string;
  accent?: boolean;
  image?: string;
}) {
  if (image) {
    return (
      <Link
        href={href}
        className="relative flex aspect-square flex-col justify-end overflow-hidden rounded-xl shadow-sm transition hover:shadow-md hover:-translate-y-0.5 active:scale-95"
      >
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0.05) 62%)" }}
        />
        <span
          className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-white/25 text-white backdrop-blur"
        >
          <Icon className="h-4 w-4" />
        </span>
        <p className="relative p-2 text-left text-xs font-bold leading-tight text-white drop-shadow">
          {label}
        </p>
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className="card flex flex-col items-center justify-center gap-1.5 p-3 text-center transition hover:shadow-md hover:-translate-y-0.5 active:scale-95"
      style={accent ? { boxShadow: `0 0 0 2px ${color}66` } : undefined}
    >
      <span
        className="flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}1A`, color }}
      >
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-xs font-bold text-slate-700">{label}</p>
    </Link>
  );
}
