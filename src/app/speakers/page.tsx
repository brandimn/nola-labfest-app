import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SpeakersPage() {
  await requireUser();
  const speakers = await prisma.speaker.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { sessions: true } } },
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold">Speakers</h1>
        <p className="text-sm text-slate-600">
          {speakers.length} experts presenting at NOLA LabFest
        </p>
      </header>

      {speakers.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-slate-600">Speakers will be announced soon.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {speakers.map((s) => (
            <li key={s.id}>
              <Link
                href={`/speakers/${s.id}`}
                className="card flex items-center gap-4 p-4 hover:shadow-md transition"
              >
                <div className="h-16 w-16 flex-shrink-0 rounded-full bg-gradient-to-br from-[#3D1E50] via-[#B13E7D] to-[#F5A547] flex items-center justify-center overflow-hidden text-white font-display text-xl font-bold">
                  {s.photoUrl ? (
                    <img src={s.photoUrl} alt={s.name} className="h-full w-full object-cover" />
                  ) : (
                    initials(s.name)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-lg font-semibold truncate">{s.name}</p>
                  {s.title && <p className="text-sm text-slate-700 truncate">{s.title}</p>}
                  {s.company && <p className="text-xs text-slate-500 truncate">{s.company}</p>}
                </div>
                <div className="text-right text-xs">
                  <p className="font-bold text-[#B13E7D]">{s._count.sessions}</p>
                  <p className="text-slate-500">{s._count.sessions === 1 ? "session" : "sessions"}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
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
