import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import QRCode from "qrcode";
import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

async function qrFor(token: string) {
  return QRCode.toDataURL(token, {
    width: 280,
    margin: 0,
    color: { dark: "#0F172A", light: "#ffffff" },
  });
}

export default async function AdminBadgesPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  await requireRole("ADMIN");
  const q = searchParams.q?.trim();

  const attendees = await prisma.user.findMany({
    where: {
      role: "ATTENDEE",
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { company: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      company: true,
      title: true,
      badgeToken: true,
    },
  });

  const badges = await Promise.all(
    attendees.map(async (a) => ({ ...a, qr: await qrFor(a.badgeToken) }))
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 print:px-0 print:py-0 print:max-w-none">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back to admin
          </Link>
          <h1 className="mt-1 text-2xl font-bold font-display">Attendee Badges</h1>
          <p className="text-sm text-slate-600">
            {badges.length} {badges.length === 1 ? "badge" : "badges"} ready to print · 4 per letter-size page
          </p>
        </div>
        <button
          onClick={undefined as any}
          className="btn-primary inline-flex items-center gap-2 print-btn"
        >
          <Printer className="h-4 w-4" /> Print badges
        </button>
      </div>

      <form className="mb-4 print:hidden" action="">
        <input
          name="q"
          type="search"
          defaultValue={q ?? ""}
          placeholder="Filter by name, email, or company…"
          className="input"
        />
      </form>

      {badges.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 print:hidden">
          No attendees match.
        </div>
      ) : (
        <div className="badge-grid">
          {badges.map((b) => (
            <BadgeCard key={b.id} attendee={b} />
          ))}
        </div>
      )}

      <style>{`
        .badge-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.35in;
        }
        @media screen and (max-width: 640px) {
          .badge-grid { grid-template-columns: 1fr; }
        }
        @media print {
          @page { size: letter; margin: 0.3in; }
          body { background: white !important; }
          .badge-grid { gap: 0.25in; }
          .badge-card { break-inside: avoid; page-break-inside: avoid; }
          nav, .print\\:hidden { display: none !important; }
          .badge-card { box-shadow: none !important; border-color: #cbd5e1 !important; }
        }
      `}</style>
      <PrintButtonScript />
    </main>
  );
}

function BadgeCard({
  attendee,
}: {
  attendee: { name: string; company: string | null; title: string | null; qr: string };
}) {
  return (
    <div
      className="badge-card relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      style={{ aspectRatio: "4 / 3", minHeight: "3in" }}
    >
      <div className="h-6 w-full bg-gradient-to-r from-[#3D1E50] via-[#B13E7D] to-[#F5A547]" />
      <div className="flex items-center justify-between px-4 pt-3">
        <img src="/nola-logo.png" alt="NOLA LabFest" className="h-10 w-auto" />
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
          Attendee
        </span>
      </div>
      <div className="grid grid-cols-[1fr,auto] gap-3 px-4 pb-4 pt-2 items-end">
        <div className="min-w-0">
          <p className="font-display text-2xl font-bold leading-tight truncate">
            {attendee.name}
          </p>
          {attendee.title && (
            <p className="text-sm text-slate-600 truncate">{attendee.title}</p>
          )}
          {attendee.company && (
            <p className="text-sm font-semibold text-[#B13E7D] truncate">
              {attendee.company}
            </p>
          )}
          <p className="mt-3 text-[10px] uppercase tracking-wider text-slate-400">
            Scan for lead capture
          </p>
        </div>
        <img
          src={attendee.qr}
          alt={`${attendee.name} QR badge`}
          className="h-28 w-28 flex-shrink-0 rounded-md border border-slate-200 bg-white p-1"
        />
      </div>
    </div>
  );
}

function PrintButtonScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `document.querySelectorAll('.print-btn').forEach(b => b.addEventListener('click', () => window.print()));`,
      }}
    />
  );
}
