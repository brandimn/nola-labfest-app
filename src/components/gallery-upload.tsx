"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, X } from "lucide-react";

// Resize/compress an image file to a reasonable JPEG data URL before upload.
async function fileToResizedDataUrl(file: File, maxSide = 1600, quality = 0.82): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  let { width, height } = img;
  if (Math.max(width, height) > maxSide) {
    const s = maxSide / Math.max(width, height);
    width = Math.round(width * s);
    height = Math.round(height * s);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

export function GalleryUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const url = await fileToResizedDataUrl(file);
      setPreview(url);
    } catch {
      setError("Could not read that image. Try another.");
    }
  }

  async function post() {
    if (!preview) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: preview, caption }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || "Upload failed");
      }
      setPreview(null);
      setCaption("");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-5">
      {!preview ? (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#7C3AED]/40 bg-white/60 px-4 py-4 font-semibold text-[#7C3AED] transition hover:bg-white">
          <Camera className="h-5 w-5" /> Add your photo
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onPick}
            className="hidden"
          />
        </label>
      ) : (
        <div className="card overflow-hidden">
          <div className="relative">
            <img src={preview} alt="Preview" className="max-h-72 w-full object-cover" />
            <button
              onClick={() => {
                setPreview(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white"
              aria-label="Remove"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-3">
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={140}
              placeholder="Add a caption (optional)"
              className="input mb-2"
            />
            <button onClick={post} disabled={busy} className="btn-primary w-full">
              {busy ? "Posting…" : "Post to the gallery"}
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
