import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Plus, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminSpeakersPage() {
  await requireRole("ADMIN");
  const speakers = await prisma.speaker.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { sessions: true } } },
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-slate-500">
        <ArrowLeft className="h-4 w-4" /> Admin
      </Link>
      <div className="mt-3 mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Speakers</h1>
          <p className="text-sm text-slate-600">{speakers.length} speaker profiles</p>
        </div>
        <Link
          href="/admin/speakers/new"
          className="btn-primary inline-flex items-center gap-1 text-sm flex-shrink-0"
        >
          <Plus className="h-4 w-4" /> Add speaker
        </Link>
      </div>

      {speakers.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          No speakers yet. Click "Add speaker" to create the first one.
        </div>
      ) : (
        <ul className="space-y-1">
          {speakers.map((s) => (
            <li key={s.id}>
              <Link
                href={`/admin/speakers/${s.id}`}
                className="card flex items-center gap-3 p-3 hover:shadow-md transition"
              >
                <div className="h-12 w-12 flex-shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-[#3D1E50] via-[#B13E7D] to-[#F5A547] text-white flex items-center justify-center font-display font-bold">
                  {s.photoUrl ? (
                    <img src={s.photoUrl} alt={s.name} className="h-full w-full object-cover" />
                  ) : (
                    initials(s.name)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{s.name}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {[s.title, s.company].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-bold text-[#B13E7D]">{s._count.sessions}</p>
                  <p className="text-slate-500">
                    {s._count.sessions === 1 ? "session" : "sessions"}
                  </p>
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
