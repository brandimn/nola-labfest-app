"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Something went wrong. Please try again.");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 1500);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10 bg-cover bg-center"
      style={{
        backgroundImage:
          "linear-gradient(160deg, rgba(15,23,42,0.72), rgba(124,58,237,0.72) 40%, rgba(177,62,125,0.7) 70%, rgba(245,165,71,0.7)), url('/nola-hero-2.jpg')",
      }}
    >
      <div className="w-full max-w-sm card p-6">
        <div className="mb-6 text-center">
          <img
            src="/nola-lockup.png"
            alt="NOLA LabFest"
            className="mx-auto mb-3 h-20 w-auto"
          />
          <p className="mt-3 text-sm text-slate-600">Pick a new password</p>
        </div>

        {!token ? (
          <div className="space-y-4">
            <p className="text-sm text-red-600">Missing reset token. Please request a new reset link.</p>
            <Link href="/forgot-password" className="btn-primary w-full block text-center">
              Request a new link
            </Link>
          </div>
        ) : done ? (
          <p className="text-sm text-slate-700 text-center">
            Password updated. Taking you to sign in&hellip;
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>
            </div>
            <div>
              <label className="label">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="input"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Updating\u2026" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
