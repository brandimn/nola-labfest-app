"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, X } from "lucide-react";

// How many can be picked in one go. Each one is decoded and redrawn on the
// phone before it is sent, so an unbounded pick on an older handset means a
// long freeze and sometimes a crashed tab.
const MAX_AT_ONCE = 12;

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
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;
    setError("");
    setReading(true);

    // Room left, so a second pick adds to the first rather than replacing it.
    const room = MAX_AT_ONCE - previews.length;
    const taking = picked.slice(0, Math.max(room, 0));
    if (picked.length > taking.length) {
      setError(`Only ${MAX_AT_ONCE} photos at a time. Post these, then add more.`);
    }

    const done: string[] = [];
    let failed = 0;
    for (const file of taking) {
      try {
        done.push(await fileToResizedDataUrl(file));
      } catch {
        failed += 1;
      }
    }
    if (failed) {
      setError(`${failed} ${failed === 1 ? "photo" : "photos"} could not be read and ${failed === 1 ? "was" : "were"} skipped.`);
    }
    setPreviews((prev) => [...prev, ...done]);
    setReading(false);
    // Clear the input so picking the same photo twice still registers.
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeAt(i: number) {
    setPreviews((prev) => prev.filter((_, n) => n !== i));
  }

  async function post() {
    if (!previews.length) return;
    setBusy(true);
    setError("");

    // One at a time, so a phone on venue wifi is not asked to hold a dozen
    // uploads open at once, and so a failure halfway leaves the rest posted
    // rather than losing the lot.
    const stuck: string[] = [];
    for (let i = 0; i < previews.length; i++) {
      setProgress(previews.length > 1 ? `Posting ${i + 1} of ${previews.length}…` : "Posting…");
      try {
        const res = await fetch("/api/gallery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: previews[i], caption }),
        });
        if (!res.ok) throw new Error();
      } catch {
        stuck.push(previews[i]);
      }
    }

    setBusy(false);
    setProgress("");
    const posted = previews.length - stuck.length;
    // Whatever failed stays on screen to try again; everything else is gone.
    setPreviews(stuck);
    if (stuck.length) {
      setError(
        posted > 0
          ? `Posted ${posted}. ${stuck.length} did not go through, still here to try again.`
          : "That did not go through. Try again."
      );
    } else {
      setCaption("");
    }
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  const many = previews.length > 1;

  return (
    <div className="mb-5">
      {!previews.length ? (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#7C3AED]/40 bg-white/60 px-4 py-4 font-semibold text-[#7C3AED] transition hover:bg-white">
          <Camera className="h-5 w-5" />
          {reading ? "Reading your photos…" : "Add your photos"}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            // No capture attribute on purpose. It opens the camera straight
            // away and hides the photo library, so nobody could post a picture
            // they had already taken, which is most of them at an event.
            onChange={onPick}
            className="hidden"
          />
        </label>
      ) : (
        <div className="card overflow-hidden">
          <div className={many ? "grid grid-cols-3 gap-1 p-1" : ""}>
            {previews.map((src, i) => (
              <div key={i} className="relative">
                <img
                  src={src}
                  alt=""
                  className={many ? "h-28 w-full rounded object-cover" : "max-h-72 w-full object-cover"}
                />
                <button
                  onClick={() => removeAt(i)}
                  className="absolute right-1 top-1 rounded-full bg-black/55 p-1.5 text-white"
                  aria-label="Remove this photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="p-3">
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={140}
              placeholder={many ? "Add a caption for all of these (optional)" : "Add a caption (optional)"}
              className="input mb-2"
            />
            <div className="flex gap-2">
              <label className="btn-secondary flex-1 cursor-pointer text-center">
                {reading ? "Reading…" : "Add more"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onPick}
                  className="hidden"
                />
              </label>
              <button onClick={post} disabled={busy || reading} className="btn-primary flex-1">
                {busy
                  ? progress || "Posting…"
                  : many
                    ? `Post ${previews.length} photos`
                    : "Post to the gallery"}
              </button>
            </div>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
