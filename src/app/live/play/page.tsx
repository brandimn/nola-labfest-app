"use client";

import { useEffect, useState } from "react";
import { deviceId, useCountdown, useLiveState, usePost } from "@/lib/live-client";

export default function PlayPage() {
  const { state, offline } = useLiveState(2000);
  const post = usePost();
  const seconds = useCountdown(state);

  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const promptId = state?.prompt?.id ?? null;
  const max = state?.game.answerMaxLength ?? 80;

  // Who is this phone, and what did it already submit for this prompt?
  useEffect(() => {
    fetch(`/api/live/play?deviceId=${encodeURIComponent(deviceId())}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setMe(d.player);
        setText(d.myAnswer ?? "");
        setSaved(!!d.myAnswer);
      })
      .catch(() => {});
  }, [promptId]);

  async function claim(playerId: string) {
    setError("");
    try {
      await post("/api/live/play", { action: "CLAIM", deviceId: deviceId(), playerId });
      const p = state?.players.find((x) => x.id === playerId);
      if (p) setMe({ id: p.id, name: p.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not pick that name");
    }
  }

  async function submit() {
    setError("");
    try {
      await post("/api/live/play", { action: "ANSWER", deviceId: deviceId(), text });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send that");
    }
  }

  const writing = state?.phase === "WRITING" && (seconds ?? 0) > 0;

  if (!me) {
    return (
      <main className="mx-auto max-w-md px-4 py-8">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.3em] text-[#F5A547]">
          {state?.game.name ?? "LabFest"}
        </p>
        <h1 className="mt-4 text-center font-display text-3xl font-bold">Who are you?</h1>
        <p className="mt-2 text-center text-sm text-white/70">Tap your name. This phone is yours for the game.</p>
        <div className="mt-6 space-y-3">
          {state?.players.map((p) => (
            <button
              key={p.id}
              onClick={() => claim(p.id)}
              disabled={p.claimed}
              className="w-full rounded-2xl bg-white/10 p-4 text-xl font-semibold disabled:opacity-40"
            >
              {p.name}{p.claimed ? " (taken)" : ""}
            </button>
          ))}
          {!state?.players.length && <p className="text-center text-sm text-white/60">No players loaded yet.</p>}
        </div>
        {error && <p className="mt-4 text-center text-sm text-red-300">{error}</p>}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#F5A547]">
          {state?.game.name}
        </p>
        <p className="text-sm font-semibold text-white/70">{me.name}</p>
      </div>

      {offline && (
        <p className="mt-3 rounded-lg bg-amber-500/20 p-2 text-center text-xs text-amber-200">
          Trouble reaching the game. Still trying.
        </p>
      )}

      {!writing ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="font-display text-3xl font-bold">
            {saved ? "Locked in" : "Get ready"}
          </p>
          <p className="mt-2 text-sm text-white/70">
            {saved ? "Look at the big screen." : "Your prompt is coming up."}
          </p>
        </div>
      ) : (
        <>
          {state?.prompt?.photo && (
            <img src={state.prompt.photo} alt="" className="mt-4 w-full rounded-xl" />
          )}
          <p className="mt-4 font-display text-2xl font-bold leading-snug">{state?.prompt?.text}</p>

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className={seconds != null && seconds <= 10 ? "font-bold text-red-300" : "text-white/70"}>
              {seconds}s left
            </span>
            <span className="text-white/50">{text.length}/{max}</span>
          </div>

          <textarea
            value={text}
            maxLength={max}
            onChange={(e) => { setText(e.target.value); setSaved(false); }}
            rows={4}
            className="mt-2 w-full rounded-xl bg-white p-3 text-lg text-slate-900 outline-none"
            placeholder="Be funny."
          />

          <button
            onClick={submit}
            disabled={!text.trim()}
            className="mt-3 w-full rounded-xl bg-[#F5A547] p-4 text-lg font-bold text-slate-900 disabled:opacity-40"
          >
            {saved ? "Saved. Send again?" : "Send it"}
          </button>
          <p className="mt-2 text-center text-xs text-white/50">
            You can change it until the timer runs out.
          </p>
          {error && <p className="mt-3 text-center text-sm text-red-300">{error}</p>}
        </>
      )}
    </main>
  );
}
