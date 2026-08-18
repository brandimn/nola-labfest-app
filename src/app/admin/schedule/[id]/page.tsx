import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { SessionForm } from "@/components/session-form";

export const dynamic = "force-dynamic";

export default async function AdminSessionEditPage({ params }: { params: { id: string } }) {
  await requireRole("ADMIN");
  const [s, speakers] = await Promise.all([
    prisma.session.findUnique({ where: { id: params.id } }),
    prisma.speaker.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!s) notFound();
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/admin/schedule" className="text-sm text-slate-500">← Schedule</Link>
      <h1 className="mt-3 mb-4 font-display text-2xl font-bold">Edit Session</h1>
      <SessionForm initial={s} speakers={speakers} />
    </main>
  );
}
