import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export default async function AdminUsersPage() {
  await requireRole("ADMIN");
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/admin" className="text-sm text-[#0F172A]">← Admin</Link>
      <h1 className="mt-3 mb-4 text-2xl font-bold">Users ({users.length})</h1>
      <ul className="space-y-1">
        {users.map((u) => (
          <li key={u.id} className="card p-3 flex justify-between">
            <div>
              <p className="font-medium">{u.name} <span className="ml-1 text-xs rounded-full bg-slate-200 px-2 py-0.5">{u.role}</span></p>
              <p className="text-xs text-slate-500">{u.email} {u.company ? `· ${u.company}` : ""}</p>
            </div>
            <p className="text-xs text-slate-400 self-center">{new Date(u.createdAt).toLocaleDateString()}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
