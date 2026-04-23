"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewUserForm() {
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
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ email: string; password: string } | null>(null);
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
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to create user");
      setResult({ email: body.email, password: body.password });
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
        <p className="mt-2 text-sm text-slate-700">
          Share these credentials with the attendee:
        </p>
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-sm">
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
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? "Creating…" : "Create user"}
      </button>
    </form>
  );
}
