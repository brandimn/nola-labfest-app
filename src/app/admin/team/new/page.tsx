import Link from "next/link";
import { requireRole } from "@/lib/session";
import { TeamForm } from "@/components/team-form";

export default async function AdminTeamNewPage() {
  await requireRole("ADMIN");
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/admin/team" className="text-sm text-[#0F172A]">← Team</Link>
      <h1 className="mt-3 mb-4 text-2xl font-bold">Add Team Member</h1>
      <TeamForm />
    </main>
  );
}
