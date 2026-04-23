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
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded: string) => onDecode(decoded),
          () => {}
        );
      } catch (e: any) {
        setError(e?.message || "Camera error — please allow camera permission and refresh.");
      }
    })();
    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s) {
        s.stop().catch(() => {}).finally(() => s.clear?.());
      }
    };
  }, [containerId, onDecode]);

  useEffect(() => {
    const s = scannerRef.current;
    if (!s) return;
    if (paused) s.pause?.(true);
    else s.resume?.();
  }, [paused]);

  return (
    <div>
      <div id={containerId} className="mx-auto w-full max-w-sm rounded-lg overflow-hidden bg-black" />
      {error && <p className="mt-2 text-sm text-red-600 text-center">{error}</p>}
    </div>
  );
}
