"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogoUpload } from "@/components/logo-upload";
import { Tag, Trash2, CalendarClock } from "lucide-react";

type Vendor = { id: string; name: string };
type Promo = {
  id: string;
  title: string;
  details: string | null;
  imageUrl: string | null;
  window: string | null;
  active: boolean;
  vendor: { id: string; name: string };
};

const EMPTY = { vendorId: "", title: "", details: "", window: "", imageUrl: "" };

export function AdminPromoManager({ vendors, initial }: { vendors: Vendor[]; initial: Promo[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function add() {
    if (!form.vendorId) return setError("Pick a vendor.");
    if (!form.title.trim()) return setError("Please give the promo a short title.");
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/promos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error || "Could not save");
      return;
    }
    setForm({ ...EMPTY });
    router.refresh();
  }

  async function toggleActive(p: Promo) {
    await fetch(`/api/admin/promos/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    router.refresh();
  }

  async function remove(p: Promo) {
    if (!confirm(`Delete "${p.title}" (${p.vendor.name})?`)) return;
    await fetch(`/api/admin/promos/${p.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="card p-4">
        <h2 className="mb-3 font-semibold">Add a promo</h2>
        <div className="space-y-3">
          <div>
            <label className="label">Vendor *</label>
            <select className="input" value={form.vendorId} onChange={(e) => update("vendorId", e.target.value)}>
              <option value="">Select a vendor…</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Title *</label>
            <input className="input" placeholder="Buy 2 get 1 free" value={form.title} onChange={(e) => update("title", e.target.value)} />
          </div>
          <div>
            <label className="label">Details</label>
            <textarea className="input" rows={3} value={form.details} onChange={(e) => update("details", e.target.value)} />
          </div>
          <div>
            <label className="label">When (optional)</label>
            <input className="input" placeholder="e.g. Oct 15-31" value={form.window} onChange={(e) => update("window", e.target.value)} />
          </div>
          <LogoUpload
            value={form.imageUrl || null}
            onChange={(v) => update("imageUrl", v || "")}
            label="Flyer or photo (optional)"
            helper="A flyer, product photo, or coupon image."
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button onClick={add} disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Add promo"}
          </button>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          All promos ({initial.length})
        </h2>
        {initial.length === 0 ? (
          <p className="card p-6 text-center text-sm text-slate-500">No promos yet.</p>
        ) : (
          <div className="space-y-2">
            {initial.map((p) => (
              <div key={p.id} className={`card p-3 ${p.active ? "" : "opacity-60"}`}>
                <div className="flex items-start gap-3">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt="" className="h-14 w-14 flex-shrink-0 rounded object-cover" />
                  ) : (
                    <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded bg-[#7C3AED]/10 text-[#7C3AED]">
                      <Tag className="h-5 w-5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#7C3AED]">{p.vendor.name}</p>
                    <p className="font-semibold leading-tight">{p.title}</p>
                    {p.details && <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{p.details}</p>}
                    {p.window && (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                        <CalendarClock className="h-3.5 w-3.5" /> {p.window}
                      </p>
                    )}
                    {!p.active && <p className="mt-1 text-xs font-semibold text-slate-400">Hidden from attendees</p>}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-100 pt-2 text-sm">
                  <button onClick={() => toggleActive(p)} className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900">
                    {p.active ? "Hide" : "Show"}
                  </button>
                  <button onClick={() => remove(p)} className="ml-auto inline-flex items-center gap-1 text-red-700 hover:text-red-900">
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
