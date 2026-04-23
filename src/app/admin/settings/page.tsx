import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { BadgeBackgroundForm } from "@/components/badge-background-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireRole("ADMIN");
  const bg = await prisma.setting.findUnique({
    where: { key: "badgeBackgroundUrl" },
  });
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/admin" className="text-sm text-slate-500">← Admin</Link>
      <h1 className="mt-3 mb-4 font-display text-2xl font-bold">Settings</h1>

      <section className="mb-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Attendee badge background
        </h2>
        <p className="mb-3 text-sm text-slate-600">
          Upload a custom image that appears behind the name + QR on every printable badge.
          Use a PNG/JPG roughly <b>1200×900</b> (4:3 ratio). Light-colored designs work best
          so the name and QR stay readable. Leave blank to use the default sunset header.
        </p>
        <BadgeBackgroundForm initialUrl={bg?.value ?? ""} />
      </section>
    </main>
  );
}
