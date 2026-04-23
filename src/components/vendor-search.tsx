"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function VendorSearch({ categories }: { categories: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const category = params.get("category") ?? "";

  function go(nextQ: string, nextCategory: string) {
    const sp = new URLSearchParams();
    if (nextQ) sp.set("q", nextQ);
    if (nextCategory) sp.set("category", nextCategory);
    router.push(`/vendors${sp.toString() ? `?${sp.toString()}` : ""}`);
  }

  return (
    <div className="space-y-2">
      <input
        className="input"
        placeholder="Search vendors…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && go(q, category)}
      />
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => go(q, "")}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${
              !category ? "bg-[#0F172A] text-white" : "bg-slate-200 text-slate-700"
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => go(q, c)}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${
                category === c ? "bg-[#0F172A] text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
