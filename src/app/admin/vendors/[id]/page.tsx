import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { VendorForm } from "@/components/vendor-form";
import { QRDisplay } from "@/components/qr-display";

export default async function AdminVendorEditPage({ params }: { params: { id: string } }) {
  await requireRole("ADMIN");
  const v = await prisma.vendor.findUnique({ where: { id: params.id } });
  if (!v) notFound();
  const boothUrl = `${process.env.NEXTAUTH_URL || ""}/scan?t=${v.boothToken}`;
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/admin/vendors" className="text-sm text-[#0F172A]">← Vendors</Link>
      <h1 className="mt-3 mb-4 text-2xl font-bold">Edit Vendor</h1>
      <VendorForm initial={v} />
      <div className="card mt-6 p-5">
        <h2 className="font-semibold mb-2">Booth QR Code</h2>
        <p className="text-sm text-slate-600 mb-3">Print and display at the booth.</p>
        <QRDisplay value={boothUrl} size={240} />
        <p className="mt-2 text-xs break-all text-slate-500">{boothUrl}</p>
      </div>
    </main>
  );
}
