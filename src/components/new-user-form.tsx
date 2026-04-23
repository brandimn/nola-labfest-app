"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewUserForm({ emailConfigured }: { emailConfigured: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "ATTENDEE",
    company: "",
    title: "",
    phone: "",
    password: "",
  });
  const [sendEmail, setSendEmail] = useState(emailConfigured);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    email: string;
    password: string;
    emailed?: { ok: boolean; reason?: string } | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sendEmail }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to create user");
      setResult({ email: body.email, password: body.password, emailed: body.emailed });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="card p-5">
        <p className="font-semibold text-green-700">User created.</p>
        {result.emailed?.ok ? (
          <p className="mt-1 text-sm text-green-700">✉️ Invitation email sent to {result.email}.</p>
        ) : result.emailed && !result.emailed.ok ? (
          <p className="mt-1 text-sm text-amber-700">
            ⚠️ Email failed: {result.emailed.reason}
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-600">
            {emailConfigured
              ? "No email sent (you unchecked the box or the user is a vendor/admin)."
              : "No email was sent — add RESEND_API_KEY in Vercel to enable invitations."}
          </p>
        )}
        <p className="mt-3 text-sm text-slate-700">Credentials:</p>
        <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-sm">
          <p><span className="text-slate-500">Email:</span> {result.email}</p>
          <p><span className="text-slate-500">Password:</span> {result.password}</p>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              setResult(null);
              setForm({
                name: "",
                email: "",
                role: "ATTENDEE",
                company: "",
                title: "",
                phone: "",
                password: "",
              });
            }}
            className="btn-secondary"
          >
            Add another
          </button>
          <button onClick={() => router.push("/admin/users")} className="btn-primary">
            Back to users
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card p-5 space-y-3">
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
      <div>
        <label className="label">Password <span className="text-xs font-normal text-slate-500">(leave blank to auto-generate)</span></label>
        <input className="input" value={form.password} onChange={(e) => update("password", e.target.value)} />
      </div>
      {emailConfigured ? (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
            className="h-4 w-4"
          />
          Email them their login + install instructions right away
        </label>
      ) : (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
          Email not configured — add <code>RESEND_API_KEY</code> in Vercel to auto-send invites.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? "Creating…" : "Create user"}
      </button>
    </form>
  );
}
