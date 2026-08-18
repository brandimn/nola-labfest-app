"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoUpload } from "@/components/logo-upload";

type Profile = {
  name: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  linkedIn: string | null;
  photoUrl: string | null;
};

export function MySpeakerForm({ initial }: { initial: Profile }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function update<K extends keyof Profile>(k: K, v: Profile[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  }

  async function save() {
    setSaving(true); setError(""); setSaved(false);
    const res = await fetch("/api/speaker/profile", {
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
        This is what attendees see on the speakers page and next to your session.
      </p>
      <div><label className="label">Name *</label><input className="input" value={form.name} onChange={(e) => update("name", e.target.value)} /></div>
      <LogoUpload
        value={form.photoUrl}
        onChange={(v) => update("photoUrl", v || null)}
        label="Your headshot"
        helper="A square photo looks best."
      />
      <div><label className="label">Title</label><input className="input" value={form.title ?? ""} onChange={(e) => update("title", e.target.value)} /></div>
      <div><label className="label">Company</label><input className="input" value={form.company ?? ""} onChange={(e) => update("company", e.target.value)} /></div>
      <div><label className="label">LinkedIn</label><input className="input" value={form.linkedIn ?? ""} onChange={(e) => update("linkedIn", e.target.value)} /></div>
      <div><label className="label">Bio</label><textarea className="input" rows={7} value={form.bio ?? ""} onChange={(e) => update("bio", e.target.value)} /></div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {saved && <p className="text-green-700 text-sm">Saved. Attendees see this right away.</p>}
      <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save changes"}</button>
    </div>
  );
}
