import Link from "next/link";
import { requireRole } from "@/lib/session";
import { BoothCleanup } from "@/components/booth-cleanup";

export default async function BoothCleanupPage() {
  await requireRole("ADMIN");
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/admin" className="text-sm text-[#0F172A]">← Admin</Link>
      <h1 className="mt-3 mb-1 text-2xl font-bold">Booth Cleanup</h1>
      <p className="mb-5 text-sm text-slate-600">
        Finds booths that got listed twice under slightly different names, booths that are not on
        the 2026 roster, and booths still missing a logo, website, category or description.
      </p>
      <BoothCleanup />
    </main>
  );
}
