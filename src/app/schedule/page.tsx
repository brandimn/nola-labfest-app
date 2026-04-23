import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatDay, formatTime } from "@/lib/utils";

const TRACK_COLORS: Record<string, string> = {
  Clinical: "bg-emerald-100 text-emerald-800",
  Business: "bg-amber-100 text-amber-800",
  Technology: "bg-sky-100 text-sky-800",
  Social: "bg-pink-100 text-pink-800",
};

export default async function SchedulePage() {
  const user = await requireUser();
  const sessions = await prisma.session.findMany({ orderBy: { startsAt: "asc" } });
  const favorites = new Set(
    (await prisma.favorite.findMany({ where: { userId: user.id }, select: { sessionId: true } }))
      .map((f) => f.sessionId)
  );

  const byDay: Record<string, typeof sessions> = {};
  for (const s of sessions) {
    const day = formatDay(s.startsAt);
    (byDay[day] ||= []).push(s);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Schedule</h1>
        <Link href="/agenda" className="text-sm text-[#0F172A] font-medium">My Agenda →</Link>
      </div>
      {Object.keys(byDay).length === 0 && (
        <p className="text-slate-500">No sessions scheduled yet.</p>
      )}
      {Object.entries(byDay).map(([day, list]) => (
        <section key={day} className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{day}</h2>
          <ul className="space-y-2">
            {list.map((s) => (
              <li key={s.id}>
                <Link href={`/schedule/${s.id}`} className="card block p-3 hover:shadow-md transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{s.title}</p>
                      {s.speaker && <p className="text-xs text-slate-500">{s.speaker}</p>}
                      <p className="text-xs text-slate-500">
                        {formatTime(s.startsAt)} – {formatTime(s.endsAt)}
                        {s.location ? ` · ${s.location}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {s.track && (
                        <span className={`rounded-full px-2 py-0.5 text-xs ${TRACK_COLORS[s.track] ?? "bg-slate-100 text-slate-600"}`}>
                          {s.track}
                        </span>
                      )}
                      {favorites.has(s.id) && <span className="text-xs text-amber-500">★</span>}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
