import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { QRDisplay } from "@/components/qr-display";
import { Globe, Mail, Phone, MapPin } from "lucide-react";
import { VendorPills } from "@/components/vendor-pills";

export default async function VendorDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const vendor = await prisma.vendor.findUnique({ where: { id: params.id } });
  if (!vendor) notFound();

  const alreadyScanned = user.role === "ATTENDEE"
    ? !!(await prisma.boothScan.findUnique({
        where: { attendeeId_vendorId: { attendeeId: user.id, vendorId: vendor.id } },
      }))
    : false;

  const boothUrl = `${process.env.NEXTAUTH_URL || ""}/scan?t=${vendor.boothToken}`;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/vendors" className="text-sm text-[#0F172A]">← All vendors</Link>
      <div className="card mt-3 p-5">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 flex-shrink-0 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
            {vendor.logoUrl ? (
              <img src={vendor.logoUrl} alt={vendor.name} className="h-full w-full object-contain" />
            ) : (
              <span className="font-bold text-slate-400 text-3xl">{vendor.name[0]}</span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold">{vendor.name}</h1>
            <p className="text-sm text-slate-600 flex items-center gap-1">
              <MapPin className="h-4 w-4" /> Booth {vendor.boothNumber}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {vendor.category && (
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs">
                  {vendor.category}
                </span>
              )}
              <VendorPills vendor={vendor} size="md" />
            </div>
          </div>
        </div>
        {vendor.description && (
          <p className="mt-4 text-slate-700 whitespace-pre-wrap">{vendor.description}</p>
        )}
        <div className="mt-4 space-y-2">
          {vendor.website && (
            <a href={vendor.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[#0F172A]">
              <Globe className="h-4 w-4" /> {vendor.website}
            </a>
          )}
          {vendor.contactEmail && (
            <a href={`mailto:${vendor.contactEmail}`} className="flex items-center gap-2 text-[#0F172A]">
              <Mail className="h-4 w-4" /> {vendor.contactEmail}
            </a>
          )}
          {vendor.contactPhone && (
            <a href={`tel:${vendor.contactPhone}`} className="flex items-center gap-2 text-[#0F172A]">
              <Phone className="h-4 w-4" /> {vendor.contactPhone}
            </a>
          )}
        </div>

        {user.role === "ATTENDEE" && alreadyScanned && (
          <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-emerald-800 text-sm">
            ✓ You've visited this booth
          </div>
        )}
      </div>

      {(user.role === "ADMIN" || user.id === vendor.userId) && (
        <div className="card mt-4 p-5">
          <h2 className="font-semibold mb-2">Booth QR Code</h2>
          <p className="text-sm text-slate-600 mb-3">Print this and display at the booth. Attendees scan it to earn a stamp.</p>
          <QRDisplay value={boothUrl} size={240} />
          <p className="mt-2 text-xs break-all text-slate-500">{boothUrl}</p>
        </div>
      )}
    </main>
  );
}
