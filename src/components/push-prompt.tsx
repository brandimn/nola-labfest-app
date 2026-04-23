"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";

function urlB64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushPrompt() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "granted" || Notification.permission === "denied") return;
    if (localStorage.getItem("nowak-push-dismissed") === "1") return;
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setVisible(false);
        return;
      }
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        alert("Push not configured yet (missing VAPID key).");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(vapidKey),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setVisible(false);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    localStorage.setItem("nowak-push-dismissed", "1");
    setVisible(false);
  }

  if (!visible) return null;
  return (
    <div className="card mb-4 p-3 flex items-center gap-3 border-[#0F172A]/30 bg-[#0F172A]/5">
      <Bell className="h-5 w-5 text-[#0F172A] flex-shrink-0" />
      <div className="flex-1 text-sm">
        <p className="font-medium">Get show updates</p>
        <p className="text-slate-600">Turn on notifications for announcements and reminders.</p>
      </div>
      <button onClick={enable} disabled={busy} className="btn-primary text-sm py-1 px-3">
        {busy ? "…" : "Enable"}
      </button>
      <button onClick={dismiss} className="text-slate-400 p-1">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
