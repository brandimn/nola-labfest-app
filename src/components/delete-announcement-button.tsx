"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteAnnouncementButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error || "Delete failed");
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={onDelete}
      disabled={busy}
      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-600"
      title="Delete announcement"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {busy ? "Deleting…" : "Delete"}
    </button>
  );
}
