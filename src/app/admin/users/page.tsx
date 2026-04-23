import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Plus, Upload, Mail, CheckCircle2, Smartphone } from "lucide-react";
import { emailConfigured } from "@/lib/email";
import { InviteButton } from "@/components/invite-button";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireRole("ADMIN");
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const counts = {
    ATTENDEE: users.filter((u) => u.role === "ATTENDEE").length,
    VENDOR: users.filter((u) => u.role === "VENDOR").length,
    ADMIN: users.filter((u) => u.role === "ADMIN").length,
    invited: users.filter((u) => u.invitedAt).length,
    installed: users.filter((u) => u.installedAt).length,
  };
  const emailReady = emailConfigured();

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/admin" className="text-sm text-slate-500">← Admin</Link>
      <div className="mt-3 mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Users</h1>
          <p className="text-sm text-slate-600">
            {counts.ATTENDEE} attendees · {counts.VENDOR} vendors · {counts.ADMIN} admins
          </p>
          <p className="mt-1 flex items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3 w-3" /> {counts.invited} invited
            </span>
            <span className="inline-flex items-center gap-1">
              <Smartphone className="h-3 w-3" /> {counts.installed} installed
            </span>
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link href="/admin/users/import" className="btn-secondary inline-flex items-center gap-1 text-sm">
            <Upload className="h-4 w-4" /> Import CSV
          </Link>
          <Link href="/admin/users/new" className="btn-primary inline-flex items-center gap-1 text-sm">
            <Plus className="h-4 w-4" /> Add user
          </Link>
        </div>
      </div>

      {!emailReady && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>Email not configured.</strong> Add{" "}
          <code className="rounded bg-white px-1 text-xs">RESEND_API_KEY</code> to your Vercel
          environment variables to send attendee invitations.
        </div>
      )}

      <ul className="space-y-1">
        {users.map((u) => (
          <li key={u.id} className="card flex items-center justify-between gap-3 p-3">
            <Link href={`/admin/users/${u.id}`} className="min-w-0 flex-1 hover:opacity-80">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium truncate">{u.name}</p>
                <span className="text-[10px] rounded-full bg-slate-200 px-2 py-0.5 font-semibold uppercase tracking-wider">
                  {u.role}
                </span>
                {u.invitedAt && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-semibold">
                    <Mail className="h-3 w-3" /> Invited
                  </span>
                )}
                {u.installedAt && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-[10px] font-semibold">
                    <CheckCircle2 className="h-3 w-3" /> Installed
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate">
                {u.email}
                {u.company ? ` · ${u.company}` : ""}
              </p>
            </Link>
            {u.role === "ATTENDEE" && emailReady && (
              <InviteButton userId={u.id} alreadyInvited={!!u.invitedAt} />
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
