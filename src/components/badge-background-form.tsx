"use client";

import { useState } from "react";
import { Upload, Trash2 } from "lucide-react";

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function BadgeBackgroundForm({ initialUrl }: { initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("File too large — keep it under 2 MB.");
      return;
    }
    setError("");
    const dataUrl = await fileToDataUrl(file);
    setUrl(dataUrl);
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "badgeBackgroundUrl", value: url }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    setUrl("");
    setBusy(true);
    try {
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "badgeBackgroundUrl", value: "" }),
      });
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4">
      {url ? (
        <div className="mb-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Current background
          </p>
          <img
            src={url}
            alt="Badge background"
            className="max-h-48 w-auto rounded-lg border border-slate-200"
          />
        </div>
      ) : (
        <div className="mb-3 rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No custom background — badges use the default sunset header.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <label className="btn-secondary inline-flex cursor-pointer items-center gap-1 text-sm">
          <Upload className="h-4 w-4" /> {url ? "Replace image" : "Upload image"}
          <input type="file" accept="image/*" onChange={onFile} className="hidden" />
        </label>
        <button onClick={save} disabled={busy} className="btn-primary text-sm">
          {busy ? "Saving…" : "Save"}
        </button>
        {url && (
          <button
            onClick={clear}
            disabled={busy}
            className="btn-secondary inline-flex items-center gap-1 text-sm text-red-700"
          >
            <Trash2 className="h-4 w-4" /> Remove
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {saved && !error && <p className="mt-2 text-sm text-green-700">Saved. Visit /admin/badges to preview.</p>}
    </div>
  );
}
