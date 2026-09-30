import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { AdminPromoManager } from "@/components/admin-promo-manager";

export const dynamic = "force-dynamic";

export default async function AdminPromosPage() {
  await requireRole("ADMIN");

  const [vendors, promos] = await Promise.all([
    prisma.vendor.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.promo.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: { vendor: { select: { id: true, name: true } } },
    }),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-24">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to admin
      </Link>
      <h1 className="mt-1 text-2xl font-bold font-display">Promos &amp; Deals</h1>
      <p className="mb-4 mt-1 text-sm text-slate-600">
        Add a promo for any vendor. Vendors can also add their own from their booth. Active promos
        show to attendees on the home screen.
      </p>
      <AdminPromoManager vendors={vendors} initial={promos} />
    </main>
  );
}
