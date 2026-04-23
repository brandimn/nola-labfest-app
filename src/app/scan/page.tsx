"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { QRScanner } from "@/components/qr-scanner";
import { Check, X } from "lucide-react";

type Result = { ok: true; vendorName: string; alreadyScanned: boolean } | { ok: false; error: string };

export default function ScanPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [autoToken] = useState<string | null>(params.get("t"));

  const handleToken = useCallback(async (token: string) => {
    setPaused(true);
    const res = await fetch("/api/scan/booth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (!res.ok) setResult({ ok: false, error: data.error || "Invalid code" });
    else setResult({ ok: true, vendorName: data.vendorName, alreadyScanned: data.alreadyScanned });
  }, []);

  useEffect(() => {
    if (autoToken) handleToken(autoToken);
  }, [autoToken, handleToken]);

  function onDecode(text: string) {
    try {
      const url = new URL(text);
      const t = url.searchParams.get("t");
      if (t) return handleToken(t);
    } catch {}
    handleToken(text);
  }

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
