"use client";

import { useState } from "react";
import { Printer, X } from "lucide-react";

type Person = { id: string; name: string; company: string | null; badgeType: string | null };

/** Tick several people and print them on one sheet, six up.
 *
 *  The per badge reprint button makes a PDF holding one badge, which means one
 *  badge per page: fine for a single correction, wasteful for the handful that
 *  go missing at a registration desk. */
export function ReprintPicker({ people }: { people: Person[] }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const toggle = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="print:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn-secondary inline-flex items-center gap-1 text-sm"
      >
        <Printer className="h-4 w-4" />
        {open ? "Hide the list" : "Pick several to reprint"}
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
          <p className="mb-2 text-xs text-slate-500">
            Tick anyone who needs a new badge. They print together, six to a page.
          </p>
          <div className="max-h-72 overflow-y-auto">
            {people.map((p) => (
              <label
                key={p.id}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 text-sm hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={picked.includes(p.id)}
                  onChange={() => toggle(p.id)}
                  className="h-4 w-4"
                />
                <span className="font-medium">{p.name}</span>
                <span className="truncate text-xs text-slate-500">
                  {p.company || "no company"}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {picked.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white p-3 shadow-lg">
          <div className="mx-auto flex max-w-5xl items-center gap-2">
            <button
              onClick={() => setPicked([])}
              className="rounded-lg bg-slate-100 p-2 text-slate-600"
              aria-label="Clear the selection"
            >
              <X className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold">
              {picked.length} selected
            </span>
            <a
              href={`/api/admin/badges/pdf?ids=${picked.join(",")}`}
              className="btn-primary ml-auto inline-flex items-center gap-1"
            >
              <Printer className="h-4 w-4" /> Print these {picked.length}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
