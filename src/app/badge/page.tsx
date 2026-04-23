import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { QRDisplay } from "@/components/qr-display";

export default async function BadgePage() {
  const user = await requireUser();
  const me = await prisma.user.findUnique({ where: { id: user.id } });
  if (!me) return null;
  const badgeUrl = `${process.env.NEXTAUTH_URL || ""}/b/${me.badgeToken}`;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-2 text-2xl font-bold">My Badge</h1>
      <p className="mb-4 text-sm text-slate-600">Show this to vendors so they can scan your contact info.</p>
      <div className="card p-6 text-center">
        <h2 className="text-xl font-bold">{me.name}</h2>
        {me.title && <p className="text-slate-600">{me.title}</p>}
        {me.company && <p className="text-slate-600">{me.company}</p>}
        <div className="my-6 flex justify-center">
          <QRDisplay value={badgeUrl} size={260} />
        </div>
        <p className="text-xs text-slate-400 break-all">{me.email}</p>
      </div>
    </main>
  );
}
