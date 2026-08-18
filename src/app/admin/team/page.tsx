import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { ArrowLeft, Plus, Mail, Phone } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  await requireRole("ADMIN");
  const team = await prisma.teamMember.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to admin
      </Link>
      <div className="mt-1 mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Nowak Team</h1>
        <Link href="/admin/team/new" className="btn-primary inline-flex items-center gap-1 text-sm">
          <Plus className="h-4 w-4" /> Add member
        </Link>
      </div>

      {team.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">No team members yet. Add your first one.</div>
      ) : (
        <ul className="space-y-2">
          {team.map((m) => (
            <li key={m.id}>
              <Link href={`/admin/team/${m.id}`} className="card flex items-center gap-3 p-3 hover:shadow-md transition">
                <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-full bg-slate-100">
                  {m.photoUrl ? (
                    <img src={m.photoUrl} alt={m.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#7C3AED] to-[#F5A547] text-sm font-bold text-white">
                      {m.name.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{m.name}</p>
                  {m.title && <p className="text-xs text-slate-500">{m.title}</p>}
                  <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-400">
                    {m.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{m.email}</span>}
                    {m.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{m.phone}</span>}
                  </p>
                </div>
                <span className="text-xs text-slate-400">#{m.sortOrder}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
