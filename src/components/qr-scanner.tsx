"use client";

import { useEffect, useRef, useState } from "react";

export function QRScanner({
  onDecode,
  paused,
}: {
  onDecode: (text: string) => void;
  paused?: boolean;
}) {
  const containerId = useRef(`qr-reader-${Math.random().toString(36).slice(2)}`).current;
  const scannerRef = useRef<any>(null);
  // Keep the latest onDecode in a ref so the camera never restarts on parent re-renders.
  const onDecodeRef = useRef(onDecode);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    onDecodeRef.current = onDecode;
  }, [onDecode]);

  // Start the camera exactly once (on mount), stop it once (on unmount).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded: string) => onDecodeRef.current(decoded),
          () => {}
        );
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Camera error — please allow camera permission and refresh.");
        }
      }
    })();
    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        try {
          s.stop().catch(() => {}).finally(() => {
            try {
              s.clear?.();
            } catch {}
          });
        } catch {}
      }
    };
  }, [containerId]);

  useEffect(() => {
    const s = scannerRef.current;
    if (!s) return;
    try {
      if (paused) s.pause?.(true);
      else s.resume?.();
    } catch {}
  }, [paused]);

  return (
    <div>
      <div id={containerId} className="mx-auto w-full max-w-sm rounded-lg overflow-hidden bg-black" />
      {error && <p className="mt-2 text-sm text-red-600 text-center">{error}</p>}
    </div>
  );
}
