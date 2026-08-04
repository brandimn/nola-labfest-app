import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import QRCode from "qrcode";
import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

const DEFAULT_BG = "/badge-bg-nola.jpg";

// Badge type → label + pill colors. Drives the small role tag on each badge.
const TYPE_STYLE: Record<string, { label: string; bg: string; fg: string }> = {
  LAB: { label: "Lab", bg: "#B13E7D", fg: "#ffffff" },
  VENDOR: { label: "Vendor", bg: "#0F172A", fg: "#ffffff" },
  SPEAKER: { label: "Speaker", bg: "#F5A547", fg: "#3D1E50" },
  NOWAK: { label: "Nowak Team", bg: "#0E8C4B", fg: "#ffffff" },
  STUDENT: { label: "Student", bg: "#6B7280", fg: "#ffffff" },
  VIP: { label: "Crew", bg: "#EC4899", fg: "#ffffff" },
};

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

  const bgSetting = await prisma.setting.findUnique({
    where: { key: "badgeBackgroundUrl" },
  });
  const background = bgSetting?.value || DEFAULT_BG;

  const attendees = await prisma.user.findMany({
    where: {
      badgeType: { not: null },
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
      state: true,
      badgeType: true,
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
            <BadgeCard key={b.id} attendee={b} background={background} />
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
          .badge-card { break-inside: avoid; page-break-inside: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          nav, .print\\:hidden { display: none !important; }
          .badge-card { box-shadow: none !important; }
        }
      `}</style>
      <PrintButtonScript />
    </main>
  );
}

function BadgeCard({
  attendee,
  background,
}: {
  attendee: {
    name: string;
    company: string | null;
    title: string | null;
    state: string | null;
    badgeType: string | null;
    qr: string;
  };
  background: string;
}) {
  const type = attendee.badgeType ? TYPE_STYLE[attendee.badgeType] : null;
  const sub = [attendee.company, attendee.state].filter(Boolean).join(" · ");

  return (
    <div
      className="badge-card relative overflow-hidden rounded-2xl border border-slate-200 shadow-sm"
      style={{
        aspectRatio: "4 / 3",
        minHeight: "3in",
        backgroundImage: `url('${background}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Role tag, top-right over the photo */}
      {type && (
        <span
          className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest shadow-sm"
          style={{ backgroundColor: type.bg, color: type.fg }}
        >
          {type.label}
        </span>
      )}

      {/* Soft scrim so the name reads over the busy cityscape */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{
          height: "74%",
          background:
            "radial-gradient(ellipse 78% 46% at 50% 52%, rgba(0,0,0,0.45), rgba(0,0,0,0) 72%)",
        }}
      />

      {/* Attendee name — big, centered over the city */}
      <div
        className="absolute inset-x-0 top-0 flex flex-col items-center justify-center px-5 text-center"
        style={{ height: "74%" }}
      >
        <p
          className="font-display font-bold leading-[1.05] text-white"
          style={{ fontSize: "clamp(28px, 8.5vw, 52px)", textShadow: "0 2px 14px rgba(0,0,0,0.6)" }}
        >
          {attendee.name}
        </p>
        {sub && (
          <p
            className="mt-1.5 font-semibold text-white"
            style={{ fontSize: "15px", textShadow: "0 1px 8px rgba(0,0,0,0.65)" }}
          >
            {sub}
          </p>
        )}
      </div>

      {/* QR — tucked into the blue band, bottom-right */}
      <img
        src={attendee.qr}
        alt={`${attendee.name} QR badge`}
        className="absolute bottom-[0.16in] right-[0.2in] h-[1in] w-[1in] rounded-md border border-white bg-white p-1 shadow-md"
      />
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
