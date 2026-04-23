"use client";

import { useState } from "react";
import { Check } from "lucide-react";

type Vendor = {
  id: string;
  name: string;
  boothNumber: string;
  logoUrl: string | null;
  category: string | null;
};

export function VoteList({
  vendors,
  initialVendorId,
}: {
  vendors: Vendor[];
  initialVendorId: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(initialVendorId);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  async function castVote(vendorId: string) {
    if (busy) return;
    setError("");
    setBusy(vendorId);
    const prev = selected;
    setSelected(vendorId);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not save your vote");
      }
    } catch (e: any) {
      setSelected(prev);
      setError(e.message || "Could not save your vote");
    } finally {
      setBusy(null);
    }
  }

  const filtered = query.trim()
    ? vendors.filter((v) =>
        (v.name + " " + v.boothNumber + " " + (v.category ?? ""))
          .toLowerCase()
          .includes(query.toLowerCase())
      )
    : vendors;

  return (
    <div>
      <input
        type="search"
        placeholder="Search booths…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="input mb-3"
      />
      {selected && (
        <div className="mb-3 rounded-lg p-3 text-sm text-white bg-gradient-to-r from-[#3D1E50] via-[#B13E7D] to-[#F5A547]">
          Your vote is locked in. Tap a different booth to change it.
        </div>
      )}
      {error && (
        <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <ul className="space-y-2">
        {filtered.map((v) => {
          const isSelected = selected === v.id;
          const isBusy = busy === v.id;
          return (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => castVote(v.id)}
                disabled={isBusy}
                className={`card w-full flex items-center gap-3 p-3 text-left transition active:scale-[0.99] ${
                  isSelected
                    ? "border-[#B13E7D] ring-2 ring-[#B13E7D]/30 bg-gradient-to-r from-[#B13E7D]/5 to-[#F5A547]/5"
                    : "hover:shadow-md"
                }`}
              >
                <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
                  {v.logoUrl ? (
                    <img src={v.logoUrl} alt={v.name} className="h-full w-full object-contain" />
                  ) : (
                    <span className="font-bold text-slate-400">{v.name[0]}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{v.name}</p>
                  <p className="text-xs text-slate-500 truncate">
                    Booth {v.boothNumber}
                    {v.category ? ` · ${v.category}` : ""}
                  </p>
                </div>
                {isSelected && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-[#B13E7D]">
                    <Check className="h-4 w-4" />
                    {isBusy ? "Saving…" : "Your vote"}
                  </span>
                )}
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="text-center text-sm text-slate-500 py-6">No booths match your search.</li>
        )}
      </ul>
    </div>
  );
}
