"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ChangePasswordForm({ forced = false }: { forced?: boolean }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function save() {
    if (next !== confirm) { setError("The two new passwords do not match"); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/me/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, next }),
    });
    setSaving(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error || "Could not change your password");
      return;
    }
    setDone(true);
    setCurrent(""); setNext(""); setConfirm("");
    if (forced) { router.push("/"); router.refresh(); } else { router.refresh(); }
  }

  return (
    <div className="space-y-3">
      {!forced && (
        <div><label className="label">Current password</label><input className="input" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} /></div>
      )}
      <div><label className="label">New password</label><input className="input" type="password" value={next} onChange={(e) => setNext(e.target.value)} /></div>
      <div><label className="label">New password again</label><input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
      <p className="text-xs text-slate-500">At least 8 characters.</p>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {done && !forced && <p className="text-green-700 text-sm">Password changed.</p>}
      <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Set new password"}</button>
    </div>
  );
}
