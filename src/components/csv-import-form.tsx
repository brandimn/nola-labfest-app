"use client";

import { useState } from "react";
import Papa from "papaparse";
import { Download, FileUp } from "lucide-react";

type Row = {
  name: string;
  email: string;
  company?: string;
  title?: string;
  phone?: string;
};

type ImportResult =
  | {
      ok: true;
      email: string;
      password: string;
      name: string;
      created: boolean;
      emailed?: { ok: boolean; reason?: string } | null;
    }
  | { ok: false; email: string; error: string };

const FIELD_ALIASES: Record<keyof Row, string[]> = {
  name: ["name", "full name", "attendee name", "attendeename"],
  email: ["email", "email address", "attendee email"],
  company: ["company", "lab", "lab name", "organization", "organisation", "practice", "company name"],
  title: ["title", "job title", "role", "position"],
  phone: ["phone", "phone number", "mobile", "cell"],
};

function pick(row: Record<string, string>, aliases: string[]): string | undefined {
  const lc = Object.keys(row).reduce<Record<string, string>>((acc, k) => {
    acc[k.toLowerCase().trim()] = k;
    return acc;
  }, {});
  for (const a of aliases) {
    const k = lc[a];
    if (k && row[k]) return row[k].toString().trim();
  }
  return undefined;
}

function normalize(row: Record<string, string>): Row | null {
  const name =
    pick(row, FIELD_ALIASES.name) ||
    [pick(row, ["first name", "first"]), pick(row, ["last name", "last"])]
      .filter(Boolean)
      .join(" ")
      .trim();
  const email = pick(row, FIELD_ALIASES.email);
  if (!name || !email) return null;
  return {
    name,
    email: email.toLowerCase(),
    company: pick(row, FIELD_ALIASES.company),
    title: pick(row, FIELD_ALIASES.title),
    phone: pick(row, FIELD_ALIASES.phone),
  };
}

export function CsvImportForm({ emailConfigured }: { emailConfigured: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [sendEmails, setSendEmails] = useState(emailConfigured);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<ImportResult[]>([]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError("");
    setResults([]);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (r) => {
        const normalized = (r.data as Record<string, string>[])
          .map(normalize)
          .filter((x): x is Row => !!x);
        if (normalized.length === 0) {
          setError("Could not find name + email columns in that CSV. Check that headers include 'Email' and 'Name' (or 'First Name' / 'Last Name').");
          return;
        }
        setRows(normalized);
      },
      error: (err) => setError(err.message),
    });
  }

  async function runImport() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, sendEmails }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Import failed");
      setResults(body.results);
      setRows([]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function downloadResultsCsv() {
    const ok = results.filter((r): r is Extract<ImportResult, { ok: true }> => r.ok);
    const csv =
      "Name,Email,Password\n" +
      ok.map((r) => `"${r.name}",${r.email},${r.password}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nola-labfest-credentials.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (results.length > 0) {
    const ok = results.filter((r) => r.ok).length;
    const skipped = results.filter((r) => !r.ok).length;
    return (
      <div className="card p-5">
        <p className="font-semibold">
          Imported {ok} of {results.length} attendees
          {skipped > 0 ? ` · ${skipped} skipped` : ""}
        </p>
        <div className="mt-3 flex gap-2">
          <button onClick={downloadResultsCsv} className="btn-primary inline-flex items-center gap-1 text-sm">
            <Download className="h-4 w-4" /> Download credentials CSV
          </button>
          <button
            onClick={() => {
              setResults([]);
              setRows([]);
              setFileName("");
            }}
            className="btn-secondary text-sm"
          >
            Import another file
          </button>
        </div>
        <ul className="mt-4 space-y-1 max-h-96 overflow-auto">
          {results.map((r, i) => (
            <li
              key={i}
              className={`rounded-lg p-2 text-sm ${
                r.ok ? "bg-green-50 text-green-900" : "bg-red-50 text-red-800"
              }`}
            >
              {r.ok ? (
                <>
                  <span className="font-semibold">{r.name}</span> — {r.email}{" "}
                  <span className="font-mono text-xs">pw: {r.password}</span>
                  {!r.created && <span className="ml-1 text-xs italic">(existing user — password reset)</span>}
                  {r.emailed?.ok && <span className="ml-1 text-xs">✉️ emailed</span>}
                  {r.emailed && !r.emailed.ok && (
                    <span className="ml-1 text-xs text-amber-700">
                      (email failed: {r.emailed.reason})
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="font-semibold">{r.email}</span> — {r.error}
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="card block cursor-pointer p-5 text-center hover:bg-slate-50">
        <FileUp className="mx-auto h-8 w-8 text-slate-400" />
        <p className="mt-2 font-medium">Choose a CSV file</p>
        <p className="text-xs text-slate-500">
          {fileName || "Export your attendee list from Ticket Tailor and drop it here"}
        </p>
        <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
      </label>

      {rows.length > 0 && (
        <div className="card p-4">
          <p className="mb-2 text-sm font-semibold">
            Preview: {rows.length} attendees detected
          </p>
          <ul className="max-h-60 overflow-auto space-y-1 text-sm">
            {rows.slice(0, 15).map((r, i) => (
              <li key={i} className="flex justify-between border-b border-slate-100 py-1">
                <span className="font-medium">{r.name}</span>
                <span className="text-slate-500">{r.email}</span>
              </li>
            ))}
            {rows.length > 15 && (
              <li className="text-xs text-slate-400 italic py-1">
                …and {rows.length - 15} more
              </li>
            )}
          </ul>

          {emailConfigured ? (
            <label className="mt-3 flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={sendEmails}
                onChange={(e) => setSendEmails(e.target.checked)}
                className="h-4 w-4"
              />
              Email each attendee their login right away
            </label>
          ) : (
            <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
              Emails not configured — add <code>RESEND_API_KEY</code> in Vercel to send invites.
              You can still download credentials as CSV after import.
            </p>
          )}

          <button
            onClick={runImport}
            disabled={busy}
            className="mt-3 btn-primary w-full"
          >
            {busy
              ? "Importing…"
              : sendEmails
                ? `Create ${rows.length} accounts & send invites`
                : `Create ${rows.length} accounts`}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
