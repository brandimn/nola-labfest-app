import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SessionForm } from "@/components/session-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NewSessionPage() {
  await requireRole("ADMIN");
  const speakers = await prisma.speaker.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/admin/schedule" className="text-sm text-slate-500">← Schedule</Link>
      <h1 className="mt-3 mb-4 font-display text-2xl font-bold">New Session</h1>
      <SessionForm speakers={speakers} />
    </main>
  );
}
