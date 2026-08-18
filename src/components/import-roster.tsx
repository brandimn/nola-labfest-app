"use client";

import { useEffect, useState } from "react";

type Preview = {
  vendors: number; speakers: number; companies: number;
  alreadyInSystem: number; willCreate: number;
};
type Row = { email: string; what: string; ok: boolean; note?: string };

export function ImportRoster() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/import-roster")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setPreview(d)))
      .catch(() => setError("Could not load the preview."));
  }, []);

  async function run() {
    if (!confirm("Create these accounts now? No emails will be sent.")) return;
    setRunning(true);
    setError("");
    const res = await fetch("/api/admin/import-roster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "IMPORT" }),
    });
    const d = await res.json().catch(() => ({}));
    setRunning(false);
    if (!res.ok) { setError(d.error || "Import failed"); return; }
    setRows(d.results ?? []);
  }

  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!preview) return <p className="text-sm text-slate-500">Loading…</p>;

  const failed = rows?.filter((r) => !r.ok) ?? [];

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="grid grid-cols-2 gap-3 text-center">
          <Stat label="Vendor logins" value={preview.vendors} />
          <Stat label="Speakers" value={preview.speakers} />
          <Stat label="Booths" value={preview.companies} />
          <Stat label="Already in system" value={preview.alreadyInSystem} />
        </div>
        <p className="mt-4 text-sm text-slate-600">
          {preview.willCreate} new {preview.willCreate === 1 ? "account" : "accounts"} will be
          created. Everyone starts with the password <strong>Labfest26</strong> and is asked to
          pick their own the first time they sign in.
        </p>
      </div>

      {!rows && (
        <button onClick={run} disabled={running} className="btn-primary w-full">
          {running ? "Importing…" : "Run import"}
        </button>
      )}

      {rows && (
        <div className="card p-5">
          <h2 className="font-semibold mb-2">
            Done. {rows.filter((r) => r.ok).length} succeeded
            {failed.length > 0 ? `, ${failed.length} failed` : ""}.
          </h2>
          {failed.length > 0 && (
            <ul className="mb-3 text-sm text-red-600">
              {failed.map((r, i) => <li key={i}>{r.email}: {r.note}</li>)}
            </ul>
          )}
          <details className="text-sm">
            <summary className="cursor-pointer text-slate-600">See everything that happened</summary>
            <ul className="mt-2 max-h-80 overflow-y-auto divide-y">
              {rows.map((r, i) => (
                <li key={i} className="flex justify-between py-1.5">
                  <span>{r.email}</span>
                  <span className="text-xs text-slate-500">{r.what} · {r.note}</span>
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
