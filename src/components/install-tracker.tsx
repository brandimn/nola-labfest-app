"use client";

import { useEffect } from "react";

// Tracks when a signed-in user installs the PWA or is running it as an installed app.
// Pings /api/me/installed once per device-session so the admin can see install status.
export function InstallTracker() {
  useEffect(() => {
    let reported = false;
    const report = async () => {
      if (reported) return;
      reported = true;
      try {
        await fetch("/api/me/installed", { method: "POST" });
      } catch {
        // non-critical
      }
    };

    // Running as installed PWA (standalone display mode) — covers people who
    // already installed before we added tracking.
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as any).standalone === true;
    if (standalone) {
      report();
      return;
    }

    // Fires when the user completes "Add to Home Screen" / install
    const onInstalled = () => report();
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  return null;
}
