import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { GalleryUpload } from "@/components/gallery-upload";
import { GalleryDelete } from "@/components/gallery-delete";
import { Camera } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const user = await requireUser();
  const photos = await prisma.galleryPhoto.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-4">
        <h1 className="font-display text-4xl font-extrabold gradient-text">Gallery</h1>
        <p className="mt-1 text-sm text-slate-600">
          Share your LabFest moments. Snap it, post it, let the good times roll.
        </p>
      </header>

      <GalleryUpload />

      {photos.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center text-slate-500">
          <Camera className="h-8 w-8 text-[#B13E7D]" />
          <p>No photos yet. Be the first to post one!</p>
        </div>
      ) : (
        <div className="columns-2 gap-2 sm:columns-3 [&>*]:mb-2">
          {photos.map((p) => {
            const canDelete = user.role === "ADMIN" || p.uploaderId === user.id;
            return (
              <figure
                key={p.id}
                className="group relative break-inside-avoid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                {canDelete && <GalleryDelete id={p.id} />}
                <img src={p.url} alt={p.caption || "LabFest photo"} className="w-full" />
                <figcaption className="px-2.5 py-2">
                  {p.caption && <p className="text-sm text-slate-700">{p.caption}</p>}
                  <p className="text-[11px] text-slate-400">{p.uploaderName}</p>
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}
    </main>
  );
}
