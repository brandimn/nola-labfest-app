"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Me = { name: string; company: string | null; title: string | null; phone: string | null };

export function MyProfileForm({ initial }: { initial: Me }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function update<K extends keyof Me>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  }

  async function save() {
    setSaving(true); setError(""); setSaved(false);
    const res = await fetch("/api/me/profile", {
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
      <p className="text-sm text-slate-600">
        This is what shows on your badge and what vendors see when they scan you.
      </p>
      <div><label className="label">Name *</label><input className="input" value={form.name} onChange={(e) => update("name", e.target.value)} /></div>
      <div><label className="label">Company</label><input className="input" value={form.company ?? ""} onChange={(e) => update("company", e.target.value)} /></div>
      <div><label className="label">Title</label><input className="input" value={form.title ?? ""} onChange={(e) => update("title", e.target.value)} /></div>
      <div><label className="label">Phone</label><input className="input" value={form.phone ?? ""} onChange={(e) => update("phone", e.target.value)} /></div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {saved && <p className="text-green-700 text-sm">Saved.</p>}
      <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save changes"}</button>
    </div>
  );
}
