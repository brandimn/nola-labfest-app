import Link from "next/link";
import { requireRole } from "@/lib/session";
import { CsvImportForm } from "@/components/csv-import-form";
import { emailConfigured } from "@/lib/email";

export default async function ImportUsersPage() {
  await requireRole("ADMIN");
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/admin/users" className="text-sm text-slate-500">← Users</Link>
      <h1 className="mt-3 font-display text-2xl font-bold">Import attendees from CSV</h1>
      <p className="mb-4 text-sm text-slate-600">
        Works with Ticket Tailor exports. We auto-detect columns like{" "}
        <code className="rounded bg-slate-100 px-1 text-xs">First Name</code>,{" "}
        <code className="rounded bg-slate-100 px-1 text-xs">Last Name</code>,{" "}
        <code className="rounded bg-slate-100 px-1 text-xs">Email</code>,{" "}
        <code className="rounded bg-slate-100 px-1 text-xs">Company</code>,{" "}
        <code className="rounded bg-slate-100 px-1 text-xs">Phone</code>.
        Each attendee gets an auto-generated password.
      </p>
      <CsvImportForm emailConfigured={emailConfigured()} />
    </main>
  );
}
