"use client";

import { useCallback, useState } from "react";
import { QRScanner } from "@/components/qr-scanner";
import { Check, X } from "lucide-react";

type Attendee = { name: string; email: string; company: string | null; title: string | null; phone: string | null };
type Result =
  | { ok: true; leadId: string; attendee: Attendee; alreadyCaptured: boolean }
  | { ok: false; error: string };

export default function VendorScanPage() {
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  const onDecode = useCallback(async (text: string) => {
    setPaused(true);
    let token = text.trim();
    try {
      const url = new URL(text);
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "b" && parts[1]) token = parts[1];
    } catch {}

    const res = await fetch("/api/scan/attendee", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (!res.ok) {
      setResult({ ok: false, error: data.error || "Invalid badge" });
    } else {
      setResult({ ok: true, leadId: data.leadId, attendee: data.attendee, alreadyCaptured: data.alreadyCaptured });
      setNote(data.notes || "");
      setNoteSaved(false);
    }
  }, []);

  async function saveNote() {
    if (!result?.ok) return;
    setSavingNote(true);
    setNoteSaved(false);
    try {
      const res = await fetch(`/api/vendor/leads/${result.leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: note }),
      });
      if (res.ok) setNoteSaved(true);
    } finally {
      setSavingNote(false);
    }
  }

  function reset() {
    setResult(null);
    setPaused(false);
    setNote("");
    setNoteSaved(false);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-2 text-2xl font-bold">Capture a Lead</h1>
      <p className="mb-4 text-sm text-slate-600">Scan the attendee's badge QR code to add them to your leads.</p>

      {!result && <QRScanner onDecode={onDecode} paused={paused} />}

      {result && (
        <div className={`card p-5 ${result.ok ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          {result.ok ? (
            <>
              <div className="flex items-center gap-2">
                <Check className="h-6 w-6 text-emerald-600" />
                <h2 className="text-lg font-bold">
                  {result.alreadyCaptured ? "Already captured" : "Lead added!"}
                </h2>
              </div>
              <div className="mt-3 space-y-1 text-slate-800">
                <p className="font-semibold">{result.attendee.name}</p>
                {result.attendee.title && <p className="text-sm">{result.attendee.title}</p>}
                {result.attendee.company && <p className="text-sm">{result.attendee.company}</p>}
                <p className="text-sm">{result.attendee.email}</p>
                {result.attendee.phone && <p className="text-sm">{result.attendee.phone}</p>}
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Your notes about this lead
                </label>
                <textarea
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value);
                    setNoteSaved(false);
                  }}
                  rows={3}
                  placeholder="e.g. Interested in the zirconia line — follow up with pricing."
                  className="input"
                />
                <div className="mt-2 flex items-center gap-3">
                  <button onClick={saveNote} disabled={savingNote} className="btn-primary text-sm">
                    {savingNote ? "Saving…" : "Save note"}
                  </button>
                  {noteSaved && <span className="text-sm font-medium text-emerald-700">Saved ✓</span>}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <X className="h-6 w-6 text-red-600" />
                <h2 className="text-lg font-bold">Scan failed</h2>
              </div>
              <p className="mt-2 text-slate-700">{result.error}</p>
            </>
          )}
          <button onClick={reset} className="btn-secondary mt-4 w-full">Scan next</button>
        </div>
      )}
    </main>
  );
}
