import Link from "next/link";
import { requireRole } from "@/lib/session";
import { buildInviteEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export default async function EmailPreviewPage() {
  await requireRole("ADMIN");
  const { subject, html } = buildInviteEmail({
    to: "attendee@example.com",
    name: "Sarah Johnson",
    password: "mk-4821",
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/admin" className="text-sm text-slate-500">← Admin</Link>
      <h1 className="mt-3 mb-1 font-display text-2xl font-bold">Invitation email preview</h1>
      <p className="mb-4 text-sm text-slate-600">
        This is what each attendee receives when you invite them. Subject line:{" "}
        <strong>{subject}</strong>
      </p>
      <div
        className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </main>
  );
}
