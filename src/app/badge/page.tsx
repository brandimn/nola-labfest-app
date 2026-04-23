import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { QRDisplay } from "@/components/qr-display";

export default async function BadgePage() {
  const user = await requireUser();
  const me = await prisma.user.findUnique({ where: { id: user.id } });
  if (!me) return null;
  const badgeUrl = `${process.env.NEXTAUTH_URL || ""}/b/${me.badgeToken}`;

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-1 font-display text-2xl font-bold">My Badge</h1>
      <p className="mb-4 text-sm text-slate-600">
        Show this to vendors so they can scan your contact info.
      </p>

      <div className="card overflow-hidden shadow-lg">
        <div className="h-3 bg-gradient-to-r from-[#3D1E50] via-[#B13E7D] to-[#F5A547]" />
        <div className="bg-gradient-to-br from-[#3D1E50] to-[#1F2937] px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <img src="/nola-logo.png" alt="NOLA LabFest" className="h-12 w-auto brightness-0 invert" />
            <span className="text-[10px] uppercase tracking-widest opacity-80 font-semibold">
              Attendee
            </span>
          </div>
          <p className="mt-4 font-display text-3xl font-bold leading-tight">{me.name}</p>
          {me.title && <p className="text-sm opacity-90">{me.title}</p>}
          {me.company && <p className="text-sm font-semibold text-[#F5A547]">{me.company}</p>}
        </div>
        <div className="flex flex-col items-center bg-white px-6 py-6">
          <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
            <QRDisplay value={badgeUrl} size={240} />
          </div>
          <p className="mt-3 text-[11px] uppercase tracking-widest text-slate-400 font-semibold">
            Scan for lead capture
          </p>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-slate-500">
        Tip: add this page to your home screen for quick access.
      </p>
    </main>
  );
}
