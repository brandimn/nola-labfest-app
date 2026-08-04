import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import QRCode from "qrcode";
import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminBoothQrPage() {
  await requireRole("ADMIN");
  const base = process.env.NEXTAUTH_URL || "";

  const vendors = await prisma.vendor.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, boothNumber: true, boothToken: true, logoUrl: true },
  });

  const booths = await Promise.all(
    vendors.map(async (v) => ({
      ...v,
      qr: await QRCode.toDataURL(`${base}/scan?t=${v.boothToken}`, {
        width: 320,
        margin: 1,
        color: { dark: "#0F172A", light: "#ffffff" },
      }),
    }))
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 print:px-0 print:py-0 print:max-w-none">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back to admin
          </Link>
          <h1 className="mt-1 font-display text-2xl font-bold">Booth QR Codes</h1>
          <p className="text-sm text-slate-600">
            {booths.length} booth signs · print and place one at each booth. Attendees scan these to earn passport stamps.
          </p>
        </div>
        <button onClick={undefined as any} className="btn-primary inline-flex items-center gap-2 print-btn">
          <Printer className="h-4 w-4" /> Print booth signs
        </button>
      </div>

      {booths.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 print:hidden">No vendors yet.</div>
      ) : (
        <div className="booth-grid">
          {booths.map((b) => (
            <div
              key={b.id}
              className="booth-card flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm"
            >
              {b.logoUrl ? (
                <img src={b.logoUrl} alt={b.name} className="mb-2 h-12 w-auto object-contain" />
              ) : null}
              <p className="font-display text-xl font-bold leading-tight">{b.name}</p>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#7C3AED]">
                Booth {b.boothNumber}
              </p>
              <img src={b.qr} alt={`${b.name} booth QR`} className="h-44 w-44" />
              <p className="mt-3 text-xs text-slate-500">Scan to earn your stamp 🤓</p>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .booth-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5in; }
        @media screen and (max-width: 640px) { .booth-grid { grid-template-columns: 1fr 1fr; } }
        @media print {
          @page { size: letter; margin: 0.4in; }
          body { background: white !important; }
          .booth-grid { grid-template-columns: repeat(2, 1fr); gap: 0.4in; }
          .booth-card { break-inside: avoid; page-break-inside: avoid; box-shadow: none !important; }
          nav, .print\\:hidden { display: none !important; }
        }
      `}</style>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.querySelectorAll('.print-btn').forEach(b=>b.addEventListener('click',()=>window.print()));`,
        }}
      />
    </main>
  );
}
