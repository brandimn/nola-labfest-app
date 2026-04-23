import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { formatDay, formatTime } from "@/lib/utils";

export default async function AdminSchedulePage() {
  await requireRole("ADMIN");
  const sessions = await prisma.session.findMany({ orderBy: { startsAt: "asc" } });
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Schedule ({sessions.length})</h1>
        <Link href="/admin/schedule/new" className="btn-primary text-sm">+ New</Link>
      </div>
      <ul className="space-y-2">
        {sessions.map((s) => (
          <li key={s.id}>
            <Link href={`/admin/schedule/${s.id}`} className="card block p-3 hover:shadow-md">
              <p className="font-semibold">{s.title}</p>
              <p className="text-xs text-slate-500">
                {formatDay(s.startsAt)} · {formatTime(s.startsAt)} – {formatTime(s.endsAt)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
