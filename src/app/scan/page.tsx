"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { QRScanner } from "@/components/qr-scanner";
import { Check, X } from "lucide-react";

type Result = { ok: true; vendorName: string; alreadyScanned: boolean } | { ok: false; error: string };

function ScanInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [autoToken] = useState<string | null>(params.get("t"));

  const handleToken = useCallback(async (token: string) => {
    setPaused(true);
    try {
      const res = await fetch("/api/scan/booth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setResult({ ok: false, error: data.error || "Invalid code" });
      else setResult({ ok: true, vendorName: data.vendorName, alreadyScanned: data.alreadyScanned });
    } catch {
      setResult({ ok: false, error: "Something went wrong — please try again." });
    }
  }, []);

  useEffect(() => {
    if (autoToken) handleToken(autoToken);
  }, [autoToken, handleToken]);

  const onDecode = useCallback(
    (text: string) => {
      let token = text;
      try {
        const url = new URL(text);
        const t = url.searchParams.get("t");
        if (t) token = t;
      } catch {}
      handleToken(token);
    },
    [handleToken]
  );

  function reset() {
    setResult(null);
    setPaused(false);
    if (autoToken) router.replace("/scan");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-2 text-2xl font-bold">Scan a Booth</h1>
      <p className="mb-4 text-sm text-slate-600">Point your camera at the QR code at a vendor's booth to earn a stamp.</p>

      {!result && !autoToken && <QRScanner onDecode={onDecode} paused={paused} />}
      {!result && autoToken && (
        <p className="text-center text-sm text-slate-500">Checking in…</p>
      )}

      {result && (
        <div className={`card p-5 text-center ${result.ok ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          {result.ok ? (
            <>
              <Check className="mx-auto h-12 w-12 text-emerald-600" />
              <h2 className="mt-2 text-xl font-bold">
                {result.alreadyScanned ? "Already stamped!" : "Stamp earned!"}
              </h2>
              <p className="text-slate-700">{result.vendorName}</p>
            </>
          ) : (
            <>
              <X className="mx-auto h-12 w-12 text-red-600" />
              <h2 className="mt-2 text-xl font-bold">Scan failed</h2>
              <p className="text-slate-700">{result.error}</p>
            </>
          )}
          <button onClick={reset} className="btn-primary mt-4">Scan another</button>
        </div>
      )}
    </main>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-slate-500">Loading…</div>}>
      <ScanInner />
    </Suspense>
  );
}
