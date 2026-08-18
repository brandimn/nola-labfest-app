"use client";

import { useCallback, useEffect, useState } from "react";

type Booth = {
  id: string; name: string; boothNumber: string; onRoster: boolean;
  staff: number; leads: number; scans: number; detail: number;
  has: {
    logo: boolean; website: boolean; categories: number; description: boolean;
    sponsorTier: string | null; lunchSponsor: boolean; lotm: boolean;
  };
};
type Gap = { id: string; name: string; onRoster: boolean; missing: string[]; canAutoFill: boolean };
type Data = {
  totalBooths: number;
  duplicates: { keep: Booth; remove: Booth }[];
  notOnRoster: Booth[];
  gaps: Gap[];
  autoFillable: number;
};

function Tags({ b }: { b: Booth }) {
  const t: string[] = [];
  if (b.has.logo) t.push("logo");
  if (b.has.website) t.push("website");
  if (b.has.categories) t.push(`${b.has.categories} categories`);
  if (b.has.description) t.push("description");
  if (b.has.sponsorTier) t.push(`${b.has.sponsorTier.toLowerCase()} sponsor`);
  if (b.has.lunchSponsor) t.push("lunch sponsor");
  if (b.has.lotm) t.push("LOTM");
  if (b.staff) t.push(`${b.staff} staff`);
  if (b.leads) t.push(`${b.leads} leads`);
  return <p className="text-xs text-slate-500">{t.length ? t.join(" · ") : "nothing filled in"}</p>;
}

export function BoothCleanup() {
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/booth-cleanup", { cache: "no-store" });
      const text = await r.text();
      let d: any = null;
      try { d = JSON.parse(text); } catch {
        setError(`The server replied with HTTP ${r.status} instead of data:\n\n${text.slice(0, 500)}`);
        return;
      }
      if (d.error) setError(d.error); else setData(d);
    } catch (e) {
      setError(e instanceof Error ? `${e.name}: ${e.message}` : "The request never completed");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function merge(keepId: string, removeId: string, keepName: string, removeName: string) {
    if (!confirm(`Keep "${keepName}" and fold "${removeName}" into it?\n\nStaff, leads and scans move across first. Nothing is lost.`)) return;
    setBusy(removeId); setError(""); setNote("");
    const r = await fetch("/api/admin/booth-cleanup", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "MERGE", keepId, removeId }),
    });
    const d = await r.json();
    setBusy("");
    if (!r.ok) { setError(d.error || "Merge failed"); return; }
    setNote(`Folded ${d.merged.removed} into ${d.merged.kept}.`);
    load();
  }

  async function mergeAll() {
    const pairs = data?.duplicates ?? [];
    if (!pairs.length) return;
    if (!confirm(`Merge all ${pairs.length} pairs?\n\nEach one keeps the fuller booth and folds the empty copy into it. Staff, leads and scans move across first.`)) return;

    setBusy("mergeAll"); setError(""); setNote("");
    const done: string[] = [];
    const failed: string[] = [];

    // One request per pair. Merging all of them in a single call can run past
    // the server time limit, and that kind of failure never reaches our own
    // error handling, so it surfaces as an unhelpful generic error.
    for (let i = 0; i < pairs.length; i++) {
      const p = pairs[i];
      setNote(`Merging ${i + 1} of ${pairs.length}: ${p.keep.name}…`);
      try {
        const r = await fetch("/api/admin/booth-cleanup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "MERGE", keepId: p.keep.id, removeId: p.remove.id }),
        });
        const text = await r.text();
        let d: any = null;
        try { d = JSON.parse(text); } catch { /* not JSON: server or gateway error */ }
        if (!r.ok || !d?.ok) {
          failed.push(`${p.keep.name} + ${p.remove.name} — ${d?.error ?? `HTTP ${r.status} ${text.slice(0, 120)}`}`);
          continue;
        }
        done.push(
          `${d.merged.kept}${d.merged.gained.length ? ` — got back ${d.merged.gained.join(", ")}` : " — nothing to recover"}`
        );
      } catch (e) {
        failed.push(`${p.keep.name} + ${p.remove.name} — ${e instanceof Error ? e.message : "request never completed"}`);
      }
    }

    setBusy("");
    setNote(
      `Merged ${done.length} of ${pairs.length}.\n` + done.join("\n") +
      (failed.length ? `\n\nCould not merge ${failed.length}:\n` + failed.join("\n") : "")
    );
    load();
  }

  async function fill() {
    setBusy("fill"); setError(""); setNote("");
    const r = await fetch("/api/admin/booth-cleanup", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "FILL" }),
    });
    const d = await r.json();
    setBusy("");
    if (!r.ok) { setError(d.error || "Could not fill"); return; }
    setNote(`Filled in ${d.filled.length} ${d.filled.length === 1 ? "booth" : "booths"}.`);
    load();
  }

  if (error) return (
    <div className="space-y-3">
      <pre className="card whitespace-pre-wrap p-3 text-sm text-red-700">{error}</pre>
      <button onClick={() => { setError(""); load(); }} className="btn-secondary text-sm">Try again</button>
    </div>
  );
  if (!data) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-6">
      {note && <pre className="card whitespace-pre-wrap p-3 text-sm text-green-800">{note}</pre>}
      <p className="text-sm text-slate-600">{data.totalBooths} booths in the app.</p>

      <section>
        <h2 className="mb-2 font-semibold">
          Listed twice ({data.duplicates.length})
        </h2>
        {data.duplicates.length === 0 ? (
          <p className="text-sm text-slate-500">None. Nothing is doubled up.</p>
        ) : (
          <>
          <div className="card mb-3 p-4">
            <p className="mb-2 text-sm">
              Merge all {data.duplicates.length} at once. Each keeps the fuller booth and folds
              the empty copy into it, so your photos, descriptions, categories and sponsor flags
              come back onto one listing.
            </p>
            <button onClick={mergeAll} disabled={busy === "mergeAll"} className="btn-primary text-sm">
              {busy === "mergeAll" ? "Merging…" : `Merge all ${data.duplicates.length}`}
            </button>
          </div>
          <ul className="space-y-3">
            {data.duplicates.map((p) => (
              <li key={p.remove.id} className="card p-4">
                <div className="mb-2">
                  <p className="text-xs uppercase tracking-wide text-green-700">Keep</p>
                  <p className="font-semibold">{p.keep.name}</p>
                  <Tags b={p.keep} />
                </div>
                <div className="mb-3">
                  <p className="text-xs uppercase tracking-wide text-red-700">Fold in and remove</p>
                  <p className="font-semibold">{p.remove.name}</p>
                  <Tags b={p.remove} />
                </div>
                <button
                  onClick={() => merge(p.keep.id, p.remove.id, p.keep.name, p.remove.name)}
                  disabled={busy === p.remove.id}
                  className="btn-primary text-sm"
                >
                  {busy === p.remove.id ? "Merging…" : "Merge these two"}
                </button>
              </li>
            ))}
          </ul>
          </>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Not on the 2026 roster ({data.notOnRoster.length})</h2>
        <p className="mb-2 text-sm text-slate-600">
          These are in the app but not on your app email list. Check with Marybeth whether they
          are still coming, then edit or delete them from the Vendors screen.
        </p>
        {data.notOnRoster.length === 0 ? (
          <p className="text-sm text-slate-500">None.</p>
        ) : (
          <ul className="card divide-y">
            {data.notOnRoster.map((b) => (
              <li key={b.id} className="p-3">
                <Link href={`/admin/vendors/${b.id}`} className="font-medium hover:underline">{b.name}</Link>
                <Tags b={b} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Missing information ({data.gaps.length})</h2>
        {data.autoFillable > 0 && (
          <div className="card mb-3 p-4">
            <p className="mb-2 text-sm">
              I can fill in the logo and website for <strong>{data.autoFillable}</strong> of these
              from your workbook and the logo files already in the app. Categories and
              descriptions are left alone, since those should be the vendor&apos;s own words.
            </p>
            <button onClick={fill} disabled={busy === "fill"} className="btn-primary text-sm">
              {busy === "fill" ? "Filling…" : "Fill in logos and websites"}
            </button>
          </div>
        )}
        {data.gaps.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing missing.</p>
        ) : (
          <ul className="card divide-y">
            {data.gaps.map((g) => (
              <li key={g.id} className="flex justify-between gap-3 p-3">
                <Link href={`/admin/vendors/${g.id}`} className="font-medium hover:underline">{g.name}</Link>
                <span className="text-xs text-slate-500 text-right">
                  no {g.missing.join(", no ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
