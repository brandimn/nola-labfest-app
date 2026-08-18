import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ChangePasswordForm } from "@/components/change-password-form";

export default async function ChangePasswordPage() {
  const user = await requireUser({ skipPasswordGate: true });
  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { mustChangePassword: true },
  });
  if (!me?.mustChangePassword) redirect("/me");

  return (
    <main className="mx-auto max-w-sm px-4 py-10">
      <div className="card p-6">
        <h1 className="mb-1 text-xl font-bold">Pick your own password</h1>
        <p className="mb-5 text-sm text-slate-600">
          You are signed in with the shared LabFest password. Choose your own so your booth
          and your leads stay yours.
        </p>
        <ChangePasswordForm forced />
      </div>
    </main>
  );
}
