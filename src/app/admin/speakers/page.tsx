import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export default async function AdminSpeakersPage() {
  await requireRole("ADMIN");
  const speakers = await prisma.speaker.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { sessions: true } } },
  });
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/admin" className="text-sm text-[#0F172A]">← Admin</Link>
      <div className="mt-3 flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Speakers ({speakers.length})</h1>
        <Link href="/admin/speakers/new" className="btn-primary text-sm">+ New</Link>
      </div>
      {speakers.length === 0 ? (
        <p className="text-sm text-slate-500">No speakers yet. Tap “+ New” to add the first one.</p>
      ) : (
        <ul className="space-y-2">
          {speakers.map((s) => (
            <li key={s.id}>
              <Link href={`/admin/speakers/${s.id}`} className="card flex justify-between p-3 hover:shadow-md">
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-xs text-slate-500">
                    {[s.title, s.company].filter(Boolean).join(" · ") || "No title yet"}
                    {` · ${s._count.sessions} ${s._count.sessions === 1 ? "session" : "sessions"}`}
                  </p>
                </div>
                <span className="text-xs text-slate-400 self-center">Edit →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
