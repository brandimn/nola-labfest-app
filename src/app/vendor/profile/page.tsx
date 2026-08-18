import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyBooth } from "@/lib/booth";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { MyBoothForm } from "@/components/my-booth-form";

export default async function MyBoothPage() {
  const user = await requireUser();
  const booth = await getMyBooth(user.id);
  if (!booth) redirect("/me");

  // Offer the categories already in use so vendors pick from the same list
  // instead of inventing near-duplicates that split the category filter.
  const rows = await prisma.vendor.findMany({ select: { categories: true, category: true } });
  const allCategories = Array.from(
    new Set(rows.flatMap((r) => [...(r.categories ?? []), r.category]).filter(Boolean) as string[])
  ).sort();

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/me" className="text-sm text-[#0F172A]">← My Account</Link>
      <h1 className="mt-3 mb-4 text-2xl font-bold">My Booth</h1>
      <MyBoothForm initial={booth} allCategories={allCategories} />
    </main>
  );
}
