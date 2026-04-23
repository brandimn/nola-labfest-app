"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Vendor = {
  id?: string;
  name: string;
  boothNumber: string;
  logoUrl: string | null;
  description: string | null;
  website: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  category: string | null;
};

export function VendorForm({ initial }: { initial?: Vendor }) {
  const router = useRouter();
  const [form, setForm] = useState<Vendor>(
    initial ?? {
      name: "",
      boothNumber: "",
      logoUrl: "",
      description: "",
      website: "",
      contactEmail: "",
      contactPhone: "",
      category: "",
    }
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update<K extends keyof Vendor>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    setError("");
    const url = initial?.id ? `/api/admin/vendors/${initial.id}` : "/api/admin/vendors";
    const method = initial?.id ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Save failed");
      return;
    }
    router.push("/admin/vendors");
    router.refresh();
  }

  async function remove() {
    if (!initial?.id) return;
    if (!confirm(`Delete ${initial.name}?`)) return;
    const res = await fetch(`/api/admin/vendors/${initial.id}`, { method: "DELETE" });
    if (res.ok) { router.push("/admin/vendors"); router.refresh(); }
  }

  return (
    <div className="space-y-3">
      <div><label className="label">Name *</label><input className="input" value={form.name} onChange={(e) => update("name", e.target.value)} /></div>
      <div><label className="label">Booth Number *</label><input className="input" value={form.boothNumber} onChange={(e) => update("boothNumber", e.target.value)} /></div>
      <div><label className="label">Category</label><input className="input" value={form.category ?? ""} onChange={(e) => update("category", e.target.value)} /></div>
      <div><label className="label">Logo URL</label><input className="input" value={form.logoUrl ?? ""} onChange={(e) => update("logoUrl", e.target.value)} /></div>
      <div><label className="label">Website</label><input className="input" value={form.website ?? ""} onChange={(e) => update("website", e.target.value)} /></div>
      <div><label className="label">Contact Email</label><input className="input" type="email" value={form.contactEmail ?? ""} onChange={(e) => update("contactEmail", e.target.value)} /></div>
      <div><label className="label">Contact Phone</label><input className="input" value={form.contactPhone ?? ""} onChange={(e) => update("contactPhone", e.target.value)} /></div>
      <div><label className="label">Description</label><textarea className="input" rows={4} value={form.description ?? ""} onChange={(e) => update("description", e.target.value)} /></div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save"}</button>
        {initial?.id && <button onClick={remove} className="btn-danger">Delete</button>}
      </div>
    </div>
  );
}
