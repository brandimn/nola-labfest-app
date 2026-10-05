"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** A random id kept on the phone so one device gets one vote and a finalist can
 *  keep their seat across a refresh. Every storage call is wrapped because
 *  private browsing throws instead of returning null. */
export function deviceId() {
  const KEY = "labfest-live-device";
  try {
    const found = localStorage.getItem(KEY);
    if (found) return found;
    const made = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(KEY, made);
    return made;
  } catch {
    // Private browsing: fall back to a per tab id so the night still works.
    const w = window as unknown as { __labfestDevice?: string };
    if (!w.__labfestDevice) {
      w.__labfestDevice = "tmp-" + Math.random().toString(36).slice(2);
    }
    return w.__labfestDevice;
  }
}

export type LiveState = {
  serverTime: number;
  game: { name: string; beltText: string; mode: string; timerSeconds: number; answerMaxLength: number; muted: boolean };
  phase: string;
  players: { id: string; name: string; claimed: boolean; answered: boolean }[];
  prompt: { id: string; round: string; text: string; photo: string | null; isFinale: boolean } | null;
  timer: { endsAt: number | null; remaining: number | null; paused: boolean };
  revealedCount: number;
  unmasked: boolean;
  answers: { id: string; text: string; votes: number | null; percent: number | null; player: string | null }[];
  answerCount: number;
  beltFinalists: string[];
  championId: string | null;
  scoreboard: { id: string; name: string; photoUrl: string | null; points: number }[] | null;
};

/** Polls the shared state. The host passes fresh so his own taps are not served
 *  from the one second edge cache. */
export function useLiveState(everyMs: number, fresh = false) {
  const [state, setState] = useState<LiveState | null>(null);
  const [offline, setOffline] = useState(false);
  const stop = useRef(false);

  useEffect(() => {
    stop.current = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const r = await fetch(`/api/live/state${fresh ? "?fresh=1" : ""}`, {
          cache: "no-store",
        });
        if (r.ok) {
          setState(await r.json());
          setOffline(false);
        } else {
          setOffline(true);
        }
      } catch {
        setOffline(true);
      }
      if (!stop.current) timer = setTimeout(tick, everyMs);
    };

    tick();
    return () => {
      stop.current = true;
      clearTimeout(timer);
    };
  }, [everyMs, fresh]);

  return { state, offline };
}

/** Seconds left, counted from the server's clock so every screen agrees even if
 *  a laptop's time is wrong. */
export function useCountdown(state: LiveState | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  if (!state) return null;
  if (state.timer.remaining != null) return state.timer.remaining;
  if (!state.timer.endsAt) return null;
  const drift = state.serverTime - now;
  return Math.max(0, Math.round((state.timer.endsAt - (now + drift)) / 1000));
}

export function usePost() {
  return useCallback(async (url: string, body: Record<string, unknown>) => {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch { /* non JSON error page */ }
    if (!r.ok) throw new Error(data?.error || `Something went wrong (${r.status})`);
    return data;
  }, []);
}
