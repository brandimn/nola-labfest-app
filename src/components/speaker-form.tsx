"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Speaker = {
  id?: string;
  name: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  photoUrl: string | null;
  linkedIn: string | null;
};

export function SpeakerForm({ initial }: { initial?: Speaker }) {
  const router = useRouter();
  const [form, setForm] = useState<Speaker>(
    initial ?? { name: "", title: "", company: "", bio: "", photoUrl: "", linkedIn: "" }
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update<K extends keyof Speaker>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    setError("");
    const url = initial?.id ? `/api/admin/speakers/${initial.id}` : "/api/admin/speakers";
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
    router.push("/admin/speakers");
    router.refresh();
  }

  async function remove() {
    if (!initial?.id) return;
    if (!confirm(`Delete ${initial.name}?`)) return;
    const res = await fetch(`/api/admin/speakers/${initial.id}`, { method: "DELETE" });
    if (res.ok) { router.push("/admin/speakers"); router.refresh(); }
  }

  return (
    <div className="space-y-3">
      <div><label className="label">Name *</label><input className="input" value={form.name} onChange={(e) => update("name", e.target.value)} /></div>
      <div><label className="label">Title</label><input className="input" value={form.title ?? ""} onChange={(e) => update("title", e.target.value)} /></div>
      <div><label className="label">Company</label><input className="input" value={form.company ?? ""} onChange={(e) => update("company", e.target.value)} /></div>
      <div><label className="label">Photo URL</label><input className="input" value={form.photoUrl ?? ""} onChange={(e) => update("photoUrl", e.target.value)} /></div>
      <div><label className="label">LinkedIn</label><input className="input" value={form.linkedIn ?? ""} onChange={(e) => update("linkedIn", e.target.value)} /></div>
      <div><label className="label">Bio</label><textarea className="input" rows={5} value={form.bio ?? ""} onChange={(e) => update("bio", e.target.value)} /></div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save"}</button>
        {initial?.id && <button onClick={remove} className="btn-danger">Delete</button>}
      </div>
    </div>
  );
}
