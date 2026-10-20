"use client";

import { useState } from "react";
import { Download } from "lucide-react";

type Photo = { id: string; caption: string | null; uploaderName: string; createdAt: string };

// Keeps a filename safe on every operating system, and short enough that a long
// caption does not produce something unopenable on Windows.
function tidy(s: string) {
  return s.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

/** Downloads every gallery photo as one zip.
 *
 *  The zip is built here rather than on the server because a server response is
 *  capped at a few megabytes and a gallery is far past that. Doing it in the
 *  browser also means the count moves while it works, which matters when there
 *  are hundreds and it takes a minute. */
export function GalleryExport({ count }: { count: number }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(count);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    setDone(0);
    try {
      const listRes = await fetch("/api/admin/gallery/list", { cache: "no-store" });
      if (!listRes.ok) throw new Error("Could not list the photos");
      const { photos } = (await listRes.json()) as { photos: Photo[] };
      setTotal(photos.length);
      if (!photos.length) throw new Error("There are no photos to export");

      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // A list of who posted what, since the filenames alone lose the captions.
      const rows = [["file", "posted by", "when", "caption"]];
      let missed = 0;

      for (let i = 0; i < photos.length; i++) {
        const p = photos[i];
        const n = String(i + 1).padStart(4, "0");
        const name = `${n} ${tidy(p.uploaderName || "unknown")}.jpg`;
        try {
          const res = await fetch(`/api/gallery/${p.id}/image`);
          if (!res.ok) throw new Error();
          zip.file(name, await res.blob());
          rows.push([
            name,
            p.uploaderName ?? "",
            new Date(p.createdAt).toLocaleString(),
            p.caption ?? "",
          ]);
        } catch {
          missed += 1;
        }
        setDone(i + 1);
      }

      zip.file(
        "photos.csv",
        rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
      );

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `labfest-photos-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      if (missed) setError(`${missed} ${missed === 1 ? "photo" : "photos"} could not be read and ${missed === 1 ? "is" : "are"} missing from the zip.`);
    } catch (e: any) {
      setError(e?.message || "That did not work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button onClick={run} disabled={busy} className="btn-primary inline-flex items-center gap-2">
        <Download className="h-4 w-4" />
        {busy ? `Collecting ${done} of ${total}…` : `Download all ${count} photos`}
      </button>
      {busy && (
        <p className="mt-2 text-sm text-slate-600">
          Keep this page open. The zip saves itself when it reaches the end.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
