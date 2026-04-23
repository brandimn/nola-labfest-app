import Link from "next/link";
import { requireRole } from "@/lib/session";
import { NewUserForm } from "@/components/new-user-form";
import { emailConfigured } from "@/lib/email";

export default async function NewUserPage() {
  await requireRole("ADMIN");
  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <Link href="/admin/users" className="text-sm text-slate-500">← Users</Link>
      <h1 className="mt-3 mb-4 font-display text-2xl font-bold">Add a user</h1>
      <NewUserForm emailConfigured={emailConfigured()} />
    </main>
  );
}
