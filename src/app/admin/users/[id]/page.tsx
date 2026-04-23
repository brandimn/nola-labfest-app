import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { EditUserForm } from "@/components/edit-user-form";

export const dynamic = "force-dynamic";

export default async function EditUserPage({ params }: { params: { id: string } }) {
  await requireRole("ADMIN");
  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) notFound();

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <Link href="/admin/users" className="text-sm text-slate-500">← Users</Link>
      <h1 className="mt-3 mb-1 font-display text-2xl font-bold">{user.name}</h1>
      <p className="mb-4 text-sm text-slate-600">
        Created {new Date(user.createdAt).toLocaleDateString()}
        {user.invitedAt && ` · Invited ${new Date(user.invitedAt).toLocaleDateString()}`}
        {user.installedAt && ` · Installed ${new Date(user.installedAt).toLocaleDateString()}`}
      </p>
      <EditUserForm
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          company: user.company ?? "",
          title: user.title ?? "",
          phone: user.phone ?? "",
        }}
      />
    </main>
  );
}
