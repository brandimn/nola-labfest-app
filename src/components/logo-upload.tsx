"use client";

import { useState } from "react";
import { Upload, Trash2 } from "lucide-react";
import { shrinkImage, readFileAsDataUrl } from "@/lib/shrink-image";

export function LogoUpload({
  value,
  onChange,
  label = "Logo",
  helper = "PNG, JPG, or SVG. Square logos (500×500) look best.",
}: {
  value: string | null;
  onChange: (dataUrlOrEmpty: string) => void;
  label?: string;
  helper?: string;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const raw = await readFileAsDataUrl(file);
      // SVG is already small and does not survive a canvas round trip.
      const out = file.type === "image/svg+xml" ? raw : await shrinkImage(raw);
      if (out.length > 1_400_000) {
        setError("That image is still too big even after shrinking. Try a smaller one.");
        return;
      }
      onChange(out);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that image");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="label">{label}</label>
      <div className="rounded-lg border border-slate-300 bg-white p-3">
        <div className="flex items-start gap-3">
          <div className="h-20 w-20 flex-shrink-0 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
            {value ? (
              <img src={value} alt="Logo preview" className="h-full w-full object-contain" />
            ) : (
              <span className="text-xs text-slate-400">No logo</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 mb-2">{helper}</p>
            <div className="flex flex-wrap gap-2">
              <label className="btn-secondary inline-flex cursor-pointer items-center gap-1 text-sm">
                <Upload className="h-4 w-4" /> {busy ? "Working…" : value ? "Replace" : "Upload"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp,image/heic,image/heif"
                  onChange={onFile}
                  className="hidden"
                />
              </label>
              {value && (
                <button
                  type="button"
                  onClick={() => onChange("")}
                  className="btn-secondary inline-flex items-center gap-1 text-sm text-red-700"
                >
                  <Trash2 className="h-4 w-4" /> Remove
                </button>
              )}
            </div>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
