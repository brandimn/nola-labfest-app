import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { TileImagesForm } from "@/components/tile-images-form";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminTilesPage() {
  await requireRole("ADMIN");
  const settings = await prisma.setting.findMany({
    where: { key: { startsWith: "tileImg:" } },
  });
  const initial: Record<string, string> = Object.fromEntries(
    settings.map((s) => [s.key.replace("tileImg:", ""), s.value])
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to admin
      </Link>
      <h1 className="mt-1 mb-1 font-display text-2xl font-bold">Home Tile Photos</h1>
      <p className="mb-4 text-sm text-slate-600">
        Give each home-screen tile its own photo. Uploads save automatically. Any tile you leave
        blank keeps its colorful icon.
      </p>
      <TileImagesForm initial={initial} />
    </main>
  );
}
