"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-cover bg-center px-4 py-10"
      style={{
        backgroundImage:
          "linear-gradient(160deg, rgba(15,23,42,0.72), rgba(124,58,237,0.72) 40%, rgba(177,62,125,0.7) 70%, rgba(245,165,71,0.7)), url('/nola-hero-2.jpg')",
      }}
    >
      <div className="w-full max-w-sm text-center">
        <img
          src="/nola-lockup.png"
          alt="NOLA LabFest"
          className="mx-auto w-full max-w-[300px] brightness-0 invert drop-shadow-lg"
        />
        <p className="mt-3 font-display text-2xl font-extrabold uppercase tracking-tight text-white drop-shadow-md">
          🤓 Lab Nerds Unite
        </p>
      </div>

      <div className="w-full max-w-sm card p-6 shadow-xl">
        <p className="mb-4 text-center text-sm font-semibold text-slate-500">Sign in to your account</p>
        <form onSubmit={onSubmit} className="space-y-4">
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
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-center text-sm">
            <Link href="/forgot-password" className="text-[#0F172A] font-medium">
              Forgot password?
            </Link>
          </p>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          New attendee?{" "}
          <Link href="/register" className="text-[#0F172A] font-medium">Register</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginInner />
    </Suspense>
  );
}
