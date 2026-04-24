import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Calendar, MapPin, Mic, Store, ArrowLeft } from "lucide-react";
import { VendorPills } from "@/components/vendor-pills";

export const dynamic = "force-dynamic";

const PINK = "#FF5DA2";
const PINK_DEEP = "#C7377A";
const INK = "#0F172A";

export default async function LotmHome() {
  await requireUser();

  const [vendors, sessions, speakers] = await Promise.all([
    prisma.vendor.findMany({
      where: { atLOTM: true },
      orderBy: { name: "asc" },
    }),
    prisma.session.findMany({
      where: { event: "LOTM" },
      orderBy: { startsAt: "asc" },
      include: { speakerRef: true },
    }),
    prisma.speaker.findMany({
      where: { sessions: { some: { event: "LOTM" } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className="min-h-screen bg-white pb-12">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-b-3xl px-5 pt-4 pb-8 text-white shadow-md"
        style={{
          background: `linear-gradient(135deg, ${INK} 0%, ${PINK_DEEP} 50%, ${PINK} 100%)`,
        }}
      >
        <Link
          href="/"
          className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-semibold hover:bg-white/25"
        >
          <ArrowLeft className="h-3 w-3" /> Back to LabFest
        </Link>

        <div className="mt-5 rounded-2xl bg-white p-4 flex items-center justify-center shadow-sm">
          <img
            src="/lotm_logo_2025_720.png"
            alt="Ladies of the Mill"
            className="w-full max-h-24 object-contain"
          />
        </div>

        <p className="mt-4 text-center text-sm italic opacity-95 max-w-md mx-auto">
          A lab summit like no other — designed by women, with all the extras.
          The official kickoff to NOLA LabFest.
        </p>

        <p className="mt-3 text-center text-[11px] uppercase tracking-[0.3em] opacity-90 font-semibold">
          Thursday · October 15, 2026
        </p>

        <div className="mt-4 flex flex-wrap justify-center gap-2 text-[10px] font-semibold uppercase tracking-widest">
          <span className="rounded-full bg-white/20 backdrop-blur px-3 py-1">
            Separate ticketed event
          </span>
          <a
            href="https://www.ladiesofthemill.com/"
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-white text-[#C7377A] px-3 py-1 font-bold hover:bg-pink-50"
          >
            Tickets at ladiesofthemill.com →
          </a>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-4">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 mt-4 mb-6">
          <StatTile icon={Calendar} label="Sessions" value={sessions.length} href="#sessions" />
          <StatTile icon={Mic} label="Speakers" value={speakers.length} href="#speakers" />
          <StatTile icon={Store} label="Vendors" value={vendors.length} href="#vendors" />
        </div>

        {/* Sessions */}
        <section id="sessions" className="mb-8">
          <h2 className="mb-2 font-display text-2xl font-bold text-slate-900">
            Thursday Schedule
          </h2>
          {sessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-pink-200 bg-pink-50/50 p-6 text-center text-sm text-slate-500">
              Schedule coming soon.
            </div>
          ) : (
            <ul className="space-y-2">
              {sessions.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/schedule/${s.id}`}
                    className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition border-l-4"
                    style={{ borderLeftColor: PINK }}
                  >
                    <p className="font-display text-lg font-bold leading-tight">
                      {s.title}
                    </p>
                    {(s.speakerRef?.name || s.speaker) && (
                      <p className="mt-0.5 text-sm font-semibold" style={{ color: PINK_DEEP }}>
                        {s.speakerRef?.name || s.speaker}
                      </p>
                    )}
                    <p className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(s.startsAt).toLocaleString("en-US", {
                          weekday: "short",
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone: "America/New_York",
                        })}
                      </span>
                      {s.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {s.location}
                        </span>
                      )}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Speakers */}
        {speakers.length > 0 && (
          <section id="speakers" className="mb-8">
            <h2 className="mb-2 font-display text-2xl font-bold text-slate-900">
              LOTM Speakers
            </h2>
            <ul className="space-y-2">
              {speakers.map((sp) => (
                <li key={sp.id}>
                  <Link
                    href={`/speakers/${sp.id}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition"
                  >
                    <div
                      className="h-14 w-14 flex-shrink-0 rounded-full overflow-hidden text-white flex items-center justify-center font-display font-bold"
                      style={{
                        background: `linear-gradient(135deg, ${INK}, ${PINK_DEEP}, ${PINK})`,
                      }}
                    >
                      {sp.photoUrl ? (
                        <img
                          src={sp.photoUrl}
                          alt={sp.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initials(sp.name)
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-display text-lg font-semibold truncate">
                        {sp.name}
                      </p>
                      {(sp.title || sp.company) && (
                        <p className="text-xs text-slate-500 truncate">
                          {[sp.title, sp.company].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Vendors at LOTM */}
        <section id="vendors">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Vendors at LOTM
            </h2>
            <span className="text-xs text-slate-500">{vendors.length} exhibitors</span>
          </div>
          {vendors.length === 0 ? (
            <div className="rounded-xl border border-dashed border-pink-200 bg-pink-50/50 p-6 text-center text-sm text-slate-500">
              Vendor list coming soon.
            </div>
          ) : (
            <ul className="space-y-2">
              {vendors.map((v) => (
                <li key={v.id}>
                  <Link
                    href={`/vendors/${v.id}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition"
                  >
                    <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
                      {v.logoUrl ? (
                        <img src={v.logoUrl} alt={v.name} className="h-full w-full object-contain" />
                      ) : (
                        <span className="font-bold text-slate-400">{v.name[0]}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold truncate">{v.name}</p>
                        <VendorPills vendor={v} omit={["lotm"]} />
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        Booth {v.boothNumber}
                        {v.category ? ` · ${v.category}` : ""}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: any;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <a
      href={href}
      className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm hover:shadow-md transition"
    >
      <Icon className="mx-auto h-4 w-4" style={{ color: PINK_DEEP }} />
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
        {label}
      </p>
    </a>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter((p) => !/^(Dr|Mr|Mrs|Ms|Prof)\.?$/i.test(p))
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}
