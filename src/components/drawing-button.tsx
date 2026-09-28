"use client";

import { useState } from "react";

type Winner = { name: string; company: string | null; email: string };

export function DrawingButton({ eligibleIds }: { eligibleIds: string[] }) {
  const [winners, setWinners] = useState<Winner[] | null>(null);
  const [rolling, setRolling] = useState(false);
  const [error, setError] = useState("");

  async function pick() {
    if (eligibleIds.length === 0) return;
    setRolling(true);
    setWinners(null);
    setError("");
    await new Promise((r) => setTimeout(r, 700));
    const res = await fetch("/api/admin/drawing", { method: "POST" });
    const data = await res.json();
    setRolling(false);
    if (!res.ok) {
      setError(data?.error || "Could not draw");
      return;
    }
    if (data?.winners) setWinners(data.winners);
  }

  return (
    <div>
      <button
        onClick={pick}
        disabled={rolling || eligibleIds.length === 0}
        className="btn-primary"
      >
        {rolling ? "🎲 Drawing…" : "Draw 3 winners"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {winners && winners.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-[#B13E7D]">
            🎉 {winners.length === 1 ? "Winner" : `${winners.length} Winners`}
          </p>
          {winners.map((w, i) => (
            <div
              key={i}
              className="card border-amber-300 bg-gradient-to-br from-amber-100 to-amber-200 p-4 text-center"
            >
              <span className="text-xs font-bold text-amber-700">#{i + 1}</span>
              <p className="mt-0.5 font-display text-2xl font-bold">{w.name}</p>
              {w.company && <p className="text-slate-700">{w.company}</p>}
              <p className="text-sm text-slate-600">{w.email}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
