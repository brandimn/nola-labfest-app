import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyBooth } from "@/lib/booth";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { MyPromosManager } from "@/components/my-promos-manager";

export const dynamic = "force-dynamic";

export default async function MyPromosPage() {
  const user = await requireUser();
  const booth = await getMyBooth(user.id);
  if (!booth) redirect("/me");

  const promos = await prisma.promo.findMany({
    where: { vendorId: booth.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-24">
      <Link href="/me" className="text-sm text-[#0F172A]">← My Account</Link>
      <h1 className="mt-3 text-2xl font-bold">My Promos</h1>
      <p className="mb-4 mt-1 text-sm text-slate-600">
        Post a show special for <strong>{booth.name}</strong>. Attendees see active promos on the
        home screen under Promos &amp; Deals.
      </p>
      <MyPromosManager initial={promos} />
    </main>
  );
}
