"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function GalleryDelete({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm("Remove this photo?")) return;
    setBusy(true);
    const res = await fetch(`/api/gallery/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else setBusy(false);
  }

  return (
    <button
      onClick={remove}
      disabled={busy}
      className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
      aria-label="Delete photo"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
