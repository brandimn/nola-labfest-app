import { requireRole } from "@/lib/session";
import { SessionForm } from "@/components/session-form";
import Link from "next/link";

export default async function NewSessionPage() {
  await requireRole("ADMIN");
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/admin/schedule" className="text-sm text-[#0F172A]">← Schedule</Link>
      <h1 className="mt-3 mb-4 text-2xl font-bold">New Session</h1>
      <SessionForm />
    </main>
  );
}
