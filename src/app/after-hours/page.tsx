import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ArrowLeft, MapPin, GlassWater, Drama } from "lucide-react";

export const dynamic = "force-dynamic";

const PURPLE = "#5B2A86";
const GOLD = "#F5A547";
const GREEN = "#0E8C4B";

export default async function AfterHoursPage() {
  await requireUser();

  const sessions = await prisma.session.findMany({
    where: { track: "After Hours" },
    orderBy: { startsAt: "asc" },
  });

  return (
    <main className="min-h-screen bg-white pb-12">
      <section
        className="relative overflow-hidden rounded-b-3xl px-5 pt-5 pb-8 text-white shadow-md"
        style={{
          background: `linear-gradient(135deg, ${PURPLE} 0%, ${GREEN} 55%, ${GOLD} 100%)`,
        }}
      >
        <Link
          href="/"
          className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-semibold hover:bg-white/25"
        >
          <ArrowLeft className="h-3 w-3" /> Home
        </Link>
        <p className="mt-4 text-[11px] uppercase tracking-[0.3em] opacity-90 font-semibold">
          After Hours
        </p>
        <h1 className="mt-1 font-display text-4xl font-bold leading-tight">
          Let the good times roll
        </h1>
        <p className="mt-2 text-sm italic opacity-95 max-w-md">
          The sessions are where you learn. The nights are where you bond.
          Bourbon, beads, and a little bit of magic — included with your badge.
        </p>
      </section>

      <div className="mx-auto max-w-2xl px-4 mt-4">
        {sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            Night events are being finalized. Check back soon.
          </div>
        ) : (
          <ul className="space-y-4">
            {sessions.map((s, i) => (
              <li key={s.id}>
                <Link
                  href={`/schedule/${s.id}`}
                  className="block rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition"
                >
                  <div
                    className="p-5 text-white"
                    style={{
                      background:
                        i % 2 === 0
                          ? `linear-gradient(135deg, ${PURPLE} 0%, ${GOLD} 100%)`
                          : `linear-gradient(135deg, ${GREEN} 0%, ${PURPLE} 100%)`,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur">
                        {iconFor(s.title)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-widest opacity-85 font-semibold">
                          {new Date(s.startsAt).toLocaleDateString("en-US", {
                            weekday: "long",
                            timeZone: "America/New_York",
                          })}
                          {" · "}
                          {new Date(s.startsAt).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            timeZone: "America/New_York",
                          })}
                        </p>
                        <p className="mt-1 font-display text-xl font-bold leading-tight">
                          {s.title}
                        </p>
                        {s.location && (
                          <p className="mt-1 flex items-center gap-1 text-xs opacity-95">
                            <MapPin className="h-3 w-3" />
                            {s.location}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  {s.description && (
                    <div className="bg-white p-4 text-sm text-slate-700">
                      {s.description}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function iconFor(title: string) {
  const lower = title.toLowerCase();
  if (/masquerade|mardi|ball|gala|party/.test(lower)) {
    return <Drama className="h-6 w-6 text-white" />;
  }
  return <GlassWater className="h-6 w-6 text-white" />;
}
