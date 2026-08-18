import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";
import { MyProfileForm } from "@/components/my-profile-form";
import { ChangePasswordForm } from "@/components/change-password-form";
import Link from "next/link";
import { IdCard, Calendar, QrCode, Store, Mic } from "lucide-react";

export default async function MePage() {
  const user = await requireUser();
  const me = await prisma.user.findUnique({
    where: { id: user.id },
    include: { ownedVendor: true, ownedSpeaker: true, boothStaffOf: true },
  });
  if (!me) return null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">My Account</h1>

      <div className="card p-5 mb-4">
        <p className="font-semibold text-lg">{me.name}</p>
        <p className="mt-1 text-sm text-slate-500">{me.email}</p>
        <span className="inline-block mt-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs">{me.role}</span>
      </div>

      <div className="grid gap-2 mb-6">
        <Link href="/badge" className="btn-secondary justify-start"><IdCard className="h-4 w-4 mr-2" /> My Badge</Link>
        <Link href="/agenda" className="btn-secondary justify-start"><Calendar className="h-4 w-4 mr-2" /> My Agenda</Link>
        {(me.ownedVendor || me.boothStaffOf) && (
          <Link href="/vendor/profile" className="btn-secondary justify-start"><Store className="h-4 w-4 mr-2" /> My Booth</Link>
        )}
        {me.ownedSpeaker && (
          <Link href="/speaker/profile" className="btn-secondary justify-start"><Mic className="h-4 w-4 mr-2" /> My Speaker Profile</Link>
        )}
        {me.role === "ATTENDEE" && (
          <Link href="/game" className="btn-secondary justify-start"><QrCode className="h-4 w-4 mr-2" /> Passport Game</Link>
        )}
      </div>

      <section className="card p-5 mb-4">
        <h2 className="mb-3 font-semibold">My details</h2>
        <MyProfileForm initial={{ name: me.name, company: me.company, title: me.title, phone: me.phone }} />
      </section>

      <section className="card p-5 mb-6">
        <h2 className="mb-3 font-semibold">Change my password</h2>
        <ChangePasswordForm />
      </section>

      <SignOutButton />
    </main>
  );
}
