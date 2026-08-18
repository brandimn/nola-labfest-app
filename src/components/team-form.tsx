"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoUpload } from "@/components/logo-upload";

type Member = {
  id?: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  sortOrder: number;
};

export function TeamForm({ initial }: { initial?: Member }) {
  const router = useRouter();
  const [form, setForm] = useState<Member>(
    initial ?? { name: "", title: "", email: "", phone: "", photoUrl: "", sortOrder: 0 }
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update<K extends keyof Member>(k: K, v: Member[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError("");
    const url = initial?.id ? `/api/admin/team/${initial.id}` : "/api/admin/team";
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
    router.push("/admin/team");
    router.refresh();
  }

  async function remove() {
    if (!initial?.id) return;
    if (!confirm(`Remove ${initial.name} from the team?`)) return;
    const res = await fetch(`/api/admin/team/${initial.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/team");
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="label">Name *</label>
        <input className="input" value={form.name} onChange={(e) => update("name", e.target.value)} />
      </div>
      <div>
        <label className="label">Title / Role</label>
        <input className="input" value={form.title ?? ""} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Sales Rep, Gulf Coast" />
      </div>
      <div>
        <label className="label">Email</label>
        <input className="input" type="email" value={form.email ?? ""} onChange={(e) => update("email", e.target.value)} />
      </div>
      <div>
        <label className="label">Phone</label>
        <input className="input" value={form.phone ?? ""} onChange={(e) => update("phone", e.target.value)} placeholder="(504) 555-0123" />
      </div>
      <div>
        <label className="label">Display order</label>
        <input
          className="input"
          type="number"
          value={form.sortOrder}
          onChange={(e) => update("sortOrder", Number(e.target.value) || 0)}
        />
        <p className="mt-1 text-xs text-slate-500">Lower numbers show first.</p>
      </div>
      <LogoUpload
        value={form.photoUrl}
        onChange={(v) => update("photoUrl", v || null)}
        label="Photo"
        helper="A head shot looks best. PNG or JPG, under 1 MB."
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? "Saving…" : "Save"}
        </button>
        {initial?.id && (
          <button onClick={remove} className="btn-danger">
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
