import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";
import Link from "next/link";
import { IdCard, Calendar, QrCode } from "lucide-react";

export default async function MePage() {
  const user = await requireUser();
  const me = await prisma.user.findUnique({ where: { id: user.id } });
  if (!me) return null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">My Account</h1>
      <div className="card p-5 mb-4">
        <p className="font-semibold text-lg">{me.name}</p>
        {me.title && <p className="text-sm text-slate-600">{me.title}</p>}
        {me.company && <p className="text-sm text-slate-600">{me.company}</p>}
        <p className="mt-2 text-sm text-slate-500">{me.email}</p>
        {me.phone && <p className="text-sm text-slate-500">{me.phone}</p>}
        <span className="inline-block mt-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs">{me.role}</span>
      </div>
      <div className="grid gap-2">
        <Link href="/badge" className="btn-secondary justify-start"><IdCard className="h-4 w-4 mr-2" /> My Badge</Link>
        <Link href="/agenda" className="btn-secondary justify-start"><Calendar className="h-4 w-4 mr-2" /> My Agenda</Link>
        {me.role === "ATTENDEE" && (
          <Link href="/game" className="btn-secondary justify-start"><QrCode className="h-4 w-4 mr-2" /> Passport Game</Link>
        )}
      </div>
      <div className="mt-6">
        <SignOutButton />
      </div>
    </main>
  );
}
