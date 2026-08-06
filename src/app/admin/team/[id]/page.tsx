import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { TeamForm } from "@/components/team-form";

export default async function AdminTeamEditPage({ params }: { params: { id: string } }) {
  await requireRole("ADMIN");
  const m = await prisma.teamMember.findUnique({ where: { id: params.id } });
  if (!m) notFound();
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/admin/team" className="text-sm text-[#0F172A]">← Team</Link>
      <h1 className="mt-3 mb-4 text-2xl font-bold">Edit Team Member</h1>
      <TeamForm initial={m} />
    </main>
  );
}
