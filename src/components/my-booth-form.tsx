"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoUpload } from "@/components/logo-upload";
import { CategoryPicker } from "@/components/category-picker";

type Booth = {
  name: string;
  boothNumber: string;
  description: string | null;
  website: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  logoUrl: string | null;
  categories: string[];
  sponsorTier: string | null;
};

export function MyBoothForm({
  initial,
  allCategories = [],
}: {
  initial: Booth;
  allCategories?: string[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function update<K extends keyof Booth>(k: K, v: Booth[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  }

  async function save() {
    setSaving(true); setError(""); setSaved(false);
    const res = await fetch("/api/vendor/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error || "Could not save");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="card bg-slate-50 p-3 text-sm text-slate-600">
        Booth number <strong>{form.boothNumber}</strong>
        {form.sponsorTier ? <> · {form.sponsorTier.toLowerCase()} sponsor</> : null}
        <p className="mt-1 text-xs">Those two are set by the LabFest team. Everything else is yours to change.</p>
      </div>
      <div><label className="label">Company name *</label><input className="input" value={form.name} onChange={(e) => update("name", e.target.value)} /></div>
      <LogoUpload value={form.logoUrl} onChange={(v) => update("logoUrl", v || null)} label="Your logo" />
      <div>
        <label className="label">Categories</label>
        <CategoryPicker
          value={form.categories}
          onChange={(next) => update("categories", next)}
          options={allCategories}
        />
      </div>
      <div><label className="label">Website</label><input className="input" value={form.website ?? ""} onChange={(e) => update("website", e.target.value)} /></div>
      <div><label className="label">Contact email</label><input className="input" type="email" value={form.contactEmail ?? ""} onChange={(e) => update("contactEmail", e.target.value)} /></div>
      <div><label className="label">Contact phone</label><input className="input" value={form.contactPhone ?? ""} onChange={(e) => update("contactPhone", e.target.value)} /></div>
      <div><label className="label">About your booth</label><textarea className="input" rows={5} value={form.description ?? ""} onChange={(e) => update("description", e.target.value)} /></div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {saved && <p className="text-green-700 text-sm">Saved. Attendees see this right away.</p>}
      <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save changes"}</button>
    </div>
  );
}
