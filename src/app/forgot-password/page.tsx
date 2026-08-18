"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong. Please try again.");
      return;
    }
    setSent(true);
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
          <p className="mt-3 text-sm text-slate-600">Forgot your password?</p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              If an account exists for that email, we just sent a reset link. Check your inbox (and spam folder) for a note from NOLA LabFest.
            </p>
            <Link href="/login" className="btn-primary w-full block text-center">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <p className="text-sm text-slate-600">
              Enter your email and we'll send you a link to pick a new password.
            </p>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                required
                autoComplete="email"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading || !email} className="btn-primary w-full">
              {loading ? "Sending\u2026" : "Send reset link"}
            </button>
            <p className="text-center text-sm text-slate-600">
              <Link href="/login" className="text-[#0F172A] font-medium">Back to sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
