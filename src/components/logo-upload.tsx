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

// Photos taken or screenshotted on a phone are routinely several megabytes,
// which is far more than a logo needs. Shrink to fit rather than rejecting it
// and making someone go find an image editor.
async function shrink(dataUrl: string, maxSide = 512): Promise<string> {
  const img = document.createElement("img");
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not read that image"));
    img.src = dataUrl;
  });
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  if (scale === 1 && dataUrl.length < 900_000) return dataUrl;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // PNG first so a logo keeps its transparent background; fall back to JPEG
  // only if PNG is still too heavy.
  const png = canvas.toDataURL("image/png");
  if (png.length < 900_000) return png;
  return canvas.toDataURL("image/jpeg", 0.9);
}

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
      const raw = await fileToDataUrl(file);
      // SVG is already small and does not survive a canvas round trip.
      const out = file.type === "image/svg+xml" ? raw : await shrink(raw);
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
