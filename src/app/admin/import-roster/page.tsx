import Link from "next/link";
import { requireRole } from "@/lib/session";
import { ImportRoster } from "@/components/import-roster";

export default async function ImportRosterPage() {
  await requireRole("ADMIN");
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/admin" className="text-sm text-[#0F172A]">← Admin</Link>
      <h1 className="mt-3 mb-1 text-2xl font-bold">Import Vendors &amp; Speakers</h1>
      <p className="mb-5 text-sm text-slate-600">
        Loads everyone from the 2026 event workbook. Safe to run more than once. It will not
        create anybody twice and it does not send any emails.
      </p>
      <ImportRoster />
    </main>
  );
}
