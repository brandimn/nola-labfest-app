"use client";

import { useState } from "react";
import { LogoUpload } from "@/components/logo-upload";

const TILES: { key: string; label: string }[] = [
  { key: "vendors", label: "Vendors" },
  { key: "schedule", label: "Schedule" },
  { key: "speakers", label: "Speakers" },
  { key: "team", label: "Nowak Team" },
  { key: "gallery", label: "Photo Gallery" },
  { key: "scan", label: "Scan Booth" },
  { key: "badge", label: "My Badge" },
  { key: "vote", label: "Vote" },
];

export function TileImagesForm({ initial }: { initial: Record<string, string> }) {
  const [imgs, setImgs] = useState<Record<string, string>>(initial);
  const [savedKey, setSavedKey] = useState("");

  async function save(key: string, value: string) {
    setImgs((m) => ({ ...m, [key]: value }));
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: `tileImg:${key}`, value }),
    });
    setSavedKey(key);
    setTimeout(() => setSavedKey((k) => (k === key ? "" : k)), 1500);
  }

  return (
    <div className="space-y-4">
      {TILES.map((t) => (
        <div key={t.key}>
          <LogoUpload
            value={imgs[t.key] || null}
            label={t.label}
            helper="A square photo (600×600) looks best. Leave blank to use the colorful icon tile."
            onChange={(v) => save(t.key, v)}
          />
          {savedKey === t.key && (
            <p className="mt-1 text-xs font-medium text-green-700">Saved ✓</p>
          )}
        </div>
      ))}
    </div>
  );
}
