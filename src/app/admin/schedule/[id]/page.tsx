import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { SessionForm } from "@/components/session-form";

export default async function AdminSessionEditPage({ params }: { params: { id: string } }) {
  await requireRole("ADMIN");
  const s = await prisma.session.findUnique({ where: { id: params.id } });
  if (!s) notFound();
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/admin/schedule" className="text-sm text-[#0F172A]">← Schedule</Link>
      <h1 className="mt-3 mb-4 text-2xl font-bold">Edit Session</h1>
      <SessionForm initial={s} />
    </main>
  );
}
