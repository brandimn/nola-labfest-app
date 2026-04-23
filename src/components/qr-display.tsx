"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QRDisplay({ value, size = 200 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string>("");
  useEffect(() => {
    QRCode.toDataURL(value, { width: size, margin: 1, color: { dark: "#0F172A", light: "#ffffff" } })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [value, size]);

  if (!dataUrl) {
    return <div className="animate-pulse rounded bg-slate-200" style={{ width: size, height: size }} />;
  }
  return <img src={dataUrl} alt="QR code" width={size} height={size} className="rounded" />;
}
