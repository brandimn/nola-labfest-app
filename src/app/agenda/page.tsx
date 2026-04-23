import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatDay, formatTime } from "@/lib/utils";

export default async function AgendaPage() {
  const user = await requireUser();
  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    include: { session: true },
    orderBy: { session: { startsAt: "asc" } },
  });

  const byDay: Record<string, typeof favorites> = {};
  for (const f of favorites) {
    const day = formatDay(f.session.startsAt);
    (byDay[day] ||= []).push(f);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/schedule" className="text-sm text-[#0F172A]">← Full schedule</Link>
      <h1 className="mt-3 mb-4 text-2xl font-bold">My Agenda</h1>
      {favorites.length === 0 ? (
        <p className="text-slate-500">No sessions saved yet. Tap the star on a session to add it.</p>
      ) : (
        Object.entries(byDay).map(([day, list]) => (
          <section key={day} className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{day}</h2>
            <ul className="space-y-2">
              {list.map((f) => (
                <li key={f.sessionId}>
                  <Link href={`/schedule/${f.session.id}`} className="card block p-3 hover:shadow-md transition">
                    <p className="font-semibold">{f.session.title}</p>
                    <p className="text-xs text-slate-500">
                      {formatTime(f.session.startsAt)} – {formatTime(f.session.endsAt)}
                      {f.session.location ? ` · ${f.session.location}` : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}
