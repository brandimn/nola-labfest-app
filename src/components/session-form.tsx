"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type S = {
  id?: string;
  title: string;
  description: string | null;
  speaker: string | null;
  speakerId: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  track: string | null;
  event: string;
};

type SpeakerOption = { id: string; name: string };

function toLocalInput(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  const tz = dt.getTimezoneOffset();
  return new Date(dt.getTime() - tz * 60000).toISOString().slice(0, 16);
}

export function SessionForm({
  initial,
  speakers,
}: {
  initial?: Omit<S, "startsAt" | "endsAt"> & { startsAt: Date | string; endsAt: Date | string };
  speakers: SpeakerOption[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<S>(
    initial
      ? { ...initial, startsAt: toLocalInput(initial.startsAt), endsAt: toLocalInput(initial.endsAt) }
      : { title: "", description: "", speaker: "", speakerId: "", location: "", track: "", startsAt: "", endsAt: "", event: "LABFEST" }
  );
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  function up<K extends keyof S>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  function pickSpeaker(id: string) {
    if (!id) {
      setForm((f) => ({ ...f, speakerId: "", speaker: f.speaker }));
      return;
    }
    const sp = speakers.find((s) => s.id === id);
    setForm((f) => ({ ...f, speakerId: id, speaker: sp?.name ?? f.speaker }));
  }

  async function save() {
    setSaving(true); setErr("");
    const body = {
      ...form,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
    };
    const url = initial?.id ? `/api/admin/sessions/${initial.id}` : "/api/admin/sessions";
    const method = initial?.id ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);
    if (!res.ok) { const b = await res.json().catch(() => ({})); setErr(b.error || "Save failed"); return; }
    router.push("/admin/schedule"); router.refresh();
  }

  async function remove() {
    if (!initial?.id || !confirm("Delete?")) return;
    const res = await fetch(`/api/admin/sessions/${initial.id}`, { method: "DELETE" });
    if (res.ok) { router.push("/admin/schedule"); router.refresh(); }
  }

  return (
    <div className="space-y-3">
      <div><label className="label">Title *</label><input className="input" value={form.title} onChange={(e) => up("title", e.target.value)} /></div>
      <div>
        <label className="label">Speaker</label>
        <select
          className="input"
          value={form.speakerId ?? ""}
          onChange={(e) => pickSpeaker(e.target.value)}
        >
          <option value="">— No speaker —</option>
          {speakers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          Add a new speaker in the <a href="/admin/speakers" className="underline">Speakers</a> admin.
        </p>
      </div>
      <div><label className="label">Location</label><input className="input" value={form.location ?? ""} onChange={(e) => up("location", e.target.value)} /></div>
      <div>
        <label className="label">Event</label>
        <select className="input" value={form.event} onChange={(e) => up("event", e.target.value)}>
          <option value="LABFEST">NOLA LabFest</option>
          <option value="LOTM">LOTM — Ladies of the Mill</option>
        </select>
      </div>
      <div><label className="label">Track</label>
        <select className="input" value={form.track ?? ""} onChange={(e) => up("track", e.target.value)}>
          <option value="">—</option>
          <option>Clinical</option><option>Business</option><option>Technology</option><option>Social</option><option>After Hours</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label">Starts *</label><input type="datetime-local" className="input" value={form.startsAt} onChange={(e) => up("startsAt", e.target.value)} /></div>
        <div><label className="label">Ends *</label><input type="datetime-local" className="input" value={form.endsAt} onChange={(e) => up("endsAt", e.target.value)} /></div>
      </div>
      <div><label className="label">Description</label><textarea className="input" rows={4} value={form.description ?? ""} onChange={(e) => up("description", e.target.value)} /></div>
      {err && <p className="text-red-600 text-sm">{err}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save"}</button>
        {initial?.id && <button onClick={remove} className="btn-danger">Delete</button>}
      </div>
    </div>
  );
}
