import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { AnnouncementForm } from "@/components/announcement-form";

export default async function AdminAnnouncementsPage() {
  await requireRole("ADMIN");
  const [announcements, subs] = await Promise.all([
    prisma.announcement.findMany({ orderBy: { sentAt: "desc" }, take: 20 }),
    prisma.pushSubscription.count(),
  ]);
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/admin" className="text-sm text-[#0F172A]">← Admin</Link>
      <h1 className="mt-3 text-2xl font-bold">Announcements</h1>
      <p className="mb-4 text-sm text-slate-600">{subs} devices subscribed.</p>
      <AnnouncementForm />
      <h2 className="mt-6 mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Recent</h2>
      <ul className="space-y-2">
        {announcements.map((a) => (
          <li key={a.id} className="card p-3">
            <p className="font-semibold">{a.title}</p>
            <p className="text-sm text-slate-700">{a.body}</p>
            <p className="mt-1 text-xs text-slate-400">
              {new Date(a.sentAt).toLocaleString("en-US", { timeZone: "America/New_York" })}
              {a.targetRole ? ` · ${a.targetRole} only` : ""}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
