import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { QRDisplay } from "@/components/qr-display";

const TYPE_LABEL: Record<string, { label: string; bg: string }> = {
  LAB: { label: "Lab", bg: "#B13E7D" },
  VENDOR: { label: "Vendor", bg: "#0F172A" },
  SPEAKER: { label: "Speaker", bg: "#F5A547" },
  NOWAK: { label: "Nowak Team", bg: "#0E8C4B" },
  STUDENT: { label: "Student", bg: "#6B7280" },
  VIP: { label: "Crew", bg: "#EC4899" },
};

export default async function BadgePage() {
  const user = await requireUser();
  const me = await prisma.user.findUnique({ where: { id: user.id } });
  if (!me) return null;
  const badgeUrl = `${process.env.NEXTAUTH_URL || ""}/b/${me.badgeToken}`;
  const type = me.badgeType ? TYPE_LABEL[me.badgeType] : null;
  const sub = [me.company, me.state].filter(Boolean).join(" · ");

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-1 font-display text-3xl font-extrabold gradient-text">My Badge</h1>
      <p className="mb-4 text-sm text-slate-600">
        Show this to a vendor so they can scan you in for lead capture.
      </p>

      <div className="card overflow-hidden shadow-lg">
        <div
          className="relative px-6 py-6 text-white"
          style={{
            backgroundImage:
              "linear-gradient(135deg, rgba(15,23,42,0.86), rgba(124,58,237,0.82) 42%, rgba(177,62,125,0.82) 72%, rgba(245,165,71,0.82)), url('/badge-bg-nola.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="flex items-center justify-between">
            <img src="/nola-lockup.png" alt="NOLA LabFest" className="h-11 w-auto brightness-0 invert" />
            {type && (
              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest shadow-sm"
                style={{ backgroundColor: type.bg }}
              >
                {type.label}
              </span>
            )}
          </div>
          <p className="mt-4 font-display text-3xl font-bold leading-tight drop-shadow">{me.name}</p>
          {me.title && <p className="text-sm opacity-95">{me.title}</p>}
          {sub && <p className="text-sm font-semibold text-[#FFD98A]">{sub}</p>}
        </div>

        <div className="flex flex-col items-center bg-white px-6 py-7">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <QRDisplay value={badgeUrl} size={260} />
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
