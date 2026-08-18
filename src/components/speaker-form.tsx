"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Upload, X } from "lucide-react";

type Speaker = {
  id?: string;
  name: string;
  title: string;
  company: string;
  bio: string;
  linkedIn: string;
  photoUrl: string;
};

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function SpeakerForm({
  initial,
  mode,
}: {
  initial?: Speaker;
  mode: "new" | "edit";
}) {
  const router = useRouter();
  const [form, setForm] = useState<Speaker>(
    initial || { name: "", title: "", company: "", bio: "", linkedIn: "", photoUrl: "" }
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function update<K extends keyof Speaker>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Photo too large — keep it under 2 MB. Try resizing on your phone first.");
      return;
    }
    setError("");
    const dataUrl = await fileToDataUrl(file);
    setForm((f) => ({ ...f, photoUrl: dataUrl }));
    setSaved(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const url =
        mode === "edit"
          ? `/api/admin/speakers/${initial!.id}`
          : "/api/admin/speakers";
      const res = await fetch(url, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Save failed");
      if (mode === "new") {
        router.push(`/admin/speakers/${body.id}`);
      } else {
        setSaved(true);
        router.refresh();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!initial?.id) return;
    if (!window.confirm(`Delete ${form.name} permanently? Their sessions stay but become unassigned.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/speakers/${initial.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Delete failed");
      }
      router.push("/admin/speakers");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={save} className="card p-5 space-y-4">
        <div>
          <label className="label">Photo</label>
          <div className="flex items-center gap-3">
            <div className="h-24 w-24 flex-shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-[#3D1E50] via-[#B13E7D] to-[#F5A547] text-white flex items-center justify-center font-display text-xl font-bold">
              {form.photoUrl ? (
                <img src={form.photoUrl} alt="Speaker" className="h-full w-full object-cover" />
              ) : form.name ? (
                initials(form.name)
              ) : (
                "?"
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="btn-secondary inline-flex cursor-pointer items-center gap-1 text-sm w-fit">
                <Upload className="h-4 w-4" />
                {form.photoUrl ? "Replace photo" : "Upload photo"}
                <input type="file" accept="image/*" onChange={onFile} className="hidden" />
              </label>
              {form.photoUrl && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, photoUrl: "" }))}
                  className="btn-secondary inline-flex items-center gap-1 text-sm text-red-700 w-fit"
                >
                  <X className="h-4 w-4" /> Remove
                </button>
              )}
              <p className="text-xs text-slate-500">Square, &lt; 2 MB. PNG or JPG.</p>
            </div>
          </div>
        </div>

        <div>
          <label className="label">Full name *</label>
          <input
            className="input"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Dr. Jane Smith"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Chief Innovation Officer"
            />
          </div>
          <div>
            <label className="label">Company</label>
            <input
              className="input"
              value={form.company}
              onChange={(e) => update("company", e.target.value)}
              placeholder="DentalFuture Group"
            />
          </div>
        </div>

        <div>
          <label className="label">Bio</label>
          <textarea
            className="input min-h-[120px]"
            value={form.bio}
            onChange={(e) => update("bio", e.target.value)}
            placeholder="Short paragraph about the speaker…"
          />
        </div>

        <div>
          <label className="label">LinkedIn URL</label>
          <input
            type="url"
            className="input"
            value={form.linkedIn}
            onChange={(e) => update("linkedIn", e.target.value)}
            placeholder="https://linkedin.com/in/..."
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-green-700">Saved.</p>}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? "Saving…" : mode === "new" ? "Create speaker" : "Save changes"}
        </button>
      </form>

      {mode === "edit" && (
        <div className="card mt-4 p-5 border-red-200">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-red-700">
            Danger zone
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Removes this speaker profile. Any sessions pointing to them stay but become
            unassigned.
          </p>
          <button
            onClick={del}
            disabled={busy}
            className="btn-danger mt-3 inline-flex items-center gap-1 text-sm"
          >
            <Trash2 className="h-4 w-4" /> Delete speaker
          </button>
        </div>
      )}
    </>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter((p) => !/^(Dr|Mr|Mrs|Ms|Prof)\.?$/i.test(p))
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}
