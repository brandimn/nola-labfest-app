import { prisma } from "@/lib/prisma";

/** Every category currently in use, from both the newer list field and the
 *  older single one, so the picker offers the same set everywhere. */
export async function getAllCategories() {
  const rows = await prisma.vendor.findMany({ select: { categories: true, category: true } });
  return Array.from(
    new Set(rows.flatMap((r) => [...(r.categories ?? []), r.category]).filter(Boolean) as string[])
  ).sort();
}
