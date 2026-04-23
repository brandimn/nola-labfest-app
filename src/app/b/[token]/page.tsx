import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function BadgeRedirect({ params }: { params: { token: string } }) {
  const user = await prisma.user.findUnique({
    where: { badgeToken: params.token },
    select: { name: true, email: true, company: true, title: true, phone: true },
  });
  if (!user) redirect("/");
  return (
    <main className="mx-auto max-w-sm px-4 py-8">
      <div className="card p-5 text-center">
        <p className="text-xs text-slate-500">Attendee Badge</p>
        <h1 className="mt-2 text-2xl font-bold">{user.name}</h1>
        {user.title && <p className="text-slate-600">{user.title}</p>}
        {user.company && <p className="text-slate-600">{user.company}</p>}
        <p className="mt-2 text-sm text-slate-500">{user.email}</p>
        {user.phone && <p className="text-sm text-slate-500">{user.phone}</p>}
        <p className="mt-4 text-xs text-slate-400">Sign in as a vendor to capture this lead.</p>
      </div>
    </main>
  );
}
