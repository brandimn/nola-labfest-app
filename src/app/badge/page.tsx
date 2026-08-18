import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { QRDisplay } from "@/components/qr-display";

const TYPE_STYLE: Record<string, { label: string; bg: string; fg: string }> = {
  LAB: { label: "Lab", bg: "#B13E7D", fg: "#ffffff" },
  VENDOR: { label: "Vendor", bg: "#0F172A", fg: "#ffffff" },
  SPEAKER: { label: "Speaker", bg: "#F5A547", fg: "#3D1E50" },
  NOWAK: { label: "Nowak Team", bg: "#0E8C4B", fg: "#ffffff" },
  STUDENT: { label: "Student", bg: "#6B7280", fg: "#ffffff" },
  VIP: { label: "Crew", bg: "#EC4899", fg: "#ffffff" },
};

export default async function BadgePage() {
  const user = await requireUser();
  const me = await prisma.user.findUnique({ where: { id: user.id } });
  if (!me) return null;
  const badgeUrl = `${process.env.NEXTAUTH_URL || ""}/b/${me.badgeToken}`;
  const type = me.badgeType ? TYPE_STYLE[me.badgeType] : null;

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-1 font-display text-3xl font-extrabold gradient-text">My Badge</h1>
      <p className="mb-4 text-sm text-slate-600">
        Show this to a vendor so they can scan you in for lead capture.
      </p>

      <div className="card overflow-hidden shadow-lg">
        {/* The badge — mirrors the printed NOLA LabFest design */}
        <div
          className="relative"
          style={{
            aspectRatio: "4 / 3",
            backgroundImage: "url('/badge-bg-nola.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {type && (
            <span
              className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest shadow-sm"
              style={{ backgroundColor: type.bg, color: type.fg }}
            >
              {type.label}
            </span>
          )}

          {/* scrim behind the name, kept to the right of the logo */}
          <div
            className="pointer-events-none absolute top-0"
            style={{
              left: "34%",
              right: 0,
              height: "74%",
              background:
                "radial-gradient(ellipse 72% 52% at 58% 50%, rgba(0,0,0,0.45), rgba(0,0,0,0) 72%)",
            }}
          />

          {/* name — big, to the right of the LabFest logo */}
          <div
            className="absolute top-0 flex items-center justify-center px-2 text-center"
            style={{ left: "35%", right: "4%", height: "74%" }}
          >
            <p
              className="font-display font-bold leading-[1.03] text-white"
              style={{ fontSize: "clamp(20px, 7vw, 40px)", textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}
            >
              {me.name}
            </p>
          </div>

          {/* blue band — lab name + state */}
          <div
            className="absolute inset-x-0 bottom-0 flex items-center px-5"
            style={{ height: "26%" }}
          >
            <div className="min-w-0">
              {me.company && (
                <p className="truncate font-display text-lg font-bold leading-tight text-white">
                  {me.company}
                </p>
              )}
              {me.state && <p className="truncate text-sm font-medium text-white/85">{me.state}</p>}
            </div>
          </div>
        </div>

        {/* Big QR for scanning */}
        <div className="flex flex-col items-center bg-white px-6 py-7">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <QRDisplay value={badgeUrl} size={250} />
          </div>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Scan for lead capture
          </p>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-slate-500">
        Tip: add this page to your home screen for quick access. 🤓
      </p>
    </main>
  );
}
