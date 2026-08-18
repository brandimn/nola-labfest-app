"use client";

import { useState } from "react";

export function LeadNote({ leadId, initialNotes }: { leadId: string; initialNotes: string }) {
  const [note, setNote] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/vendor/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: note }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <textarea
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setSaved(false);
        }}
        rows={2}
        placeholder="Add a note about this lead…"
        className="input text-sm"
      />
      <div className="mt-1.5 flex items-center gap-2">
        <button onClick={save} disabled={saving} className="btn-primary px-3 py-1 text-xs">
          {saving ? "Saving…" : "Save note"}
        </button>
        {saved && <span className="text-xs font-medium text-emerald-700">Saved ✓</span>}
      </div>
    </div>
  );
}
