import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyBooth } from "@/lib/booth";
import { getAllCategories } from "@/lib/categories";
import { requireUser } from "@/lib/session";
import { MyBoothForm } from "@/components/my-booth-form";

export default async function MyBoothPage() {
  const user = await requireUser();
  const booth = await getMyBooth(user.id);
  if (!booth) redirect("/me");

  const allCategories = await getAllCategories();

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/me" className="text-sm text-[#0F172A]">← My Account</Link>
      <h1 className="mt-3 mb-4 text-2xl font-bold">My Booth</h1>
      <MyBoothForm initial={booth} allCategories={allCategories} />
    </main>
  );
}
