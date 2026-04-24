"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, KeyRound } from "lucide-react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  company: string;
  title: string;
  phone: string;
  vendorId: string | null;
};

type VendorOption = {
  id: string;
  name: string;
  boothNumber: string;
  userId: string | null;
};

export function EditUserForm({ user, vendors = [] }: { user: User; vendors?: VendorOption[] }) {
  const router = useRouter();
  const [form, setForm] = useState(user);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [newPassword, setNewPassword] = useState<string | null>(null);

  function update<K extends keyof User>(k: K, v: User[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSavedMessage("");
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Save failed");
      setSavedMessage("Saved.");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!window.confirm("Generate a new password for this user? Their current password stops working immediately.")) return;
    setBusy(true);
    setError("");
    setNewPassword(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetPassword: true }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Reset failed");
      setNewPassword(body.newPassword);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser() {
    if (!window.confirm(`Delete ${user.name} (${user.email}) permanently? This can't be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Delete failed");
      }
      router.push("/admin/users");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={save} className="card p-5 space-y-3">
        <div>
          <label className="label">Full name</label>
          <input className="input" required value={form.name} onChange={(e) => update("name", e.target.value)} />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" required value={form.email} onChange={(e) => update("email", e.target.value)} />
        </div>
        <div>
          <label className="label">Role</label>
          <select className="input" value={form.role} onChange={(e) => update("role", e.target.value)}>
            <option value="ATTENDEE">Attendee</option>
            <option value="VENDOR">Vendor</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div>
          <label className="label">Lab / Company</label>
          <input className="input" value={form.company} onChange={(e) => update("company", e.target.value)} />
        </div>
        <div>
          <label className="label">Title</label>
          <input className="input" value={form.title} onChange={(e) => update("title", e.target.value)} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input type="tel" className="input" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
        </div>

        {form.role === "VENDOR" && (
          <div>
            <label className="label">Vendor profile</label>
            <select
              className="input"
              value={form.vendorId ?? ""}
              onChange={(e) => update("vendorId", e.target.value || null)}
            >
              <option value="">— None (they won't be able to scan badges) —</option>
              {vendors.map((v) => {
                const takenByOther =
                  v.userId && v.userId !== user.id;
                return (
                  <option
                    key={v.id}
                    value={v.id}
                    disabled={takenByOther ?? undefined}
                  >
                    {v.name} — Booth {v.boothNumber}
                    {takenByOther ? " (already assigned)" : ""}
                  </option>
                );
              })}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Pick the booth this vendor represents. They'll be able to scan
              attendee badges as this vendor, and leads will be captured to this
              booth.
            </p>
          </div>
        )}

        {savedMessage && <p className="text-sm text-green-700">{savedMessage}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? "Saving…" : "Save changes"}
        </button>
      </form>

      <div className="card mt-4 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Account tools
        </h2>
        <div className="mt-3 space-y-2">
          <button
            onClick={resetPassword}
            disabled={busy}
            className="btn-secondary inline-flex items-center gap-1 text-sm"
          >
            <KeyRound className="h-4 w-4" /> Reset password
          </button>
          {newPassword && (
            <div className="mt-2 rounded-lg bg-slate-50 border border-slate-200 p-3 font-mono text-sm">
              New password: <strong>{newPassword}</strong>
              <p className="mt-1 text-xs font-sans text-slate-500 normal-case">
                Copy this and share it with the user — they'll need it to sign in.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="card mt-4 p-5 border-red-200">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-red-700">
          Danger zone
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Deletes this user and all their scans, favorites, and lead captures.
        </p>
        <button
          onClick={deleteUser}
          disabled={busy}
          className="btn-danger mt-3 inline-flex items-center gap-1 text-sm"
        >
          <Trash2 className="h-4 w-4" /> Delete user
        </button>
      </div>
    </>
  );
}
