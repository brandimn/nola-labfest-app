"use client";

import { useState } from "react";

export function DrawingButton({ eligibleIds }: { eligibleIds: string[] }) {
  const [winner, setWinner] = useState<{ name: string; company: string | null; email: string } | null>(null);
  const [rolling, setRolling] = useState(false);

  async function pick() {
    if (eligibleIds.length === 0) return;
    setRolling(true);
    setWinner(null);
    await new Promise((r) => setTimeout(r, 600));
    const res = await fetch("/api/admin/drawing", { method: "POST" });
    const data = await res.json();
    setRolling(false);
    if (data?.winner) setWinner(data.winner);
  }

  return (
    <div>
      <button onClick={pick} disabled={rolling || eligibleIds.length === 0} className="btn-primary">
        {rolling ? "🎲 Rolling…" : "Pick a winner"}
      </button>
      {winner && (
        <div className="mt-4 card p-5 text-center bg-gradient-to-br from-amber-100 to-amber-200 border-amber-300">
          <p className="text-sm text-slate-700">🎉 Winner!</p>
          <p className="text-2xl font-bold mt-1">{winner.name}</p>
          {winner.company && <p className="text-slate-700">{winner.company}</p>}
          <p className="text-sm text-slate-600 mt-1">{winner.email}</p>
        </div>
      )}
    </div>
  );
}
