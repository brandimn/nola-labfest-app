"use client";

import { useEffect, useRef, useState } from "react";
import { useCountdown, useLiveState } from "@/lib/live-client";

const GOLD = "#F5A547";

export default function ScreenPage() {
  const { state, offline } = useLiveState(1000);
  const seconds = useCountdown(state);
  const [started, setStarted] = useState(false);
  const music = useRef<HTMLAudioElement | null>(null);
  const ding = useRef<HTMLAudioElement | null>(null);
  const lastRevealed = useRef(0);

  // Thinking music follows the writing phase. Browsers only allow this after a
  // tap, which is what Tap to Start is for.
  useEffect(() => {
    if (!started || !music.current) return;
    const shouldPlay = state?.phase === "WRITING" && !state.game.muted;
    if (shouldPlay) music.current.play().catch(() => {});
    else { music.current.pause(); music.current.currentTime = 0; }
  }, [state?.phase, state?.game.muted, started]);

  // A ding on each new answer.
  useEffect(() => {
    if (!started || !state) return;
    if (state.revealedCount > lastRevealed.current && !state.game.muted) {
      ding.current?.play().catch(() => {});
    }
    lastRevealed.current = state.revealedCount;
  }, [state?.revealedCount, state?.game.muted, started, state]);

  if (!started) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <button
          onClick={() => setStarted(true)}
          className="rounded-3xl bg-[#F5A547] px-16 py-10 font-display text-5xl font-bold text-slate-900"
        >
          Tap to Start
        </button>
      </main>
    );
  }

  const name = state?.game.name ?? "LabFest";
  const phase = state?.phase ?? "LOBBY";
  const champion =
    state?.belt?.rows.find((p) => p.id === state?.championId) ??
    state?.scoreboard?.find((p) => p.id === state?.championId);

  return (
    <main className="relative flex min-h-screen flex-col px-10 py-8">
      <audio ref={music} src="/game/sounds/thinking.mp3" loop preload="auto" />
      <audio ref={ding} src="/game/sounds/ding.mp3" preload="auto" />

      <header className="flex items-center justify-between">
        <p className="font-display text-3xl font-bold" style={{ color: GOLD }}>{name}</p>
        {state?.game.mode === "PRACTICE" && (
          <span className="rounded-full bg-amber-500 px-4 py-1 text-lg font-bold text-slate-900">
            PRACTICE
          </span>
        )}
      </header>

      {offline && (
        <p className="mt-2 text-center text-xl text-amber-300">Reconnecting…</p>
      )}

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {phase === "LOBBY" && (
          <>
            <h1 className="font-display text-8xl font-bold leading-none">{name}</h1>
            <p className="mt-6 text-3xl text-white/70">Scan to play along</p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
              {state?.players.map((p) => (
                <span key={p.id} className="rounded-2xl bg-white/10 px-8 py-4 text-4xl font-semibold">
                  {p.name}
                </span>
              ))}
            </div>
          </>
        )}

        {(phase === "PROMPT" || phase === "WRITING") && (
          <>
            {state?.prompt?.photo && (
              <img src={state.prompt.photo} alt="" className="mb-8 max-h-[40vh] rounded-2xl" />
            )}
            <h1 className="max-w-6xl font-display text-7xl font-bold leading-tight">
              {state?.prompt?.text}
            </h1>
            {phase === "WRITING" && (
              <>
                <p className="mt-10 font-display text-9xl font-bold" style={{ color: GOLD }}>
                  {seconds ?? 0}
                </p>
                <p className="mt-4 text-4xl text-white/80">
                  {state?.answerCount ?? 0} of {state?.players.length ?? 0} answered
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-4">
                  {state?.players.map((p) => (
                    <span
                      key={p.id}
                      className={`rounded-xl px-6 py-3 text-2xl font-semibold ${
                        p.answered ? "bg-[#0E8C4B] text-white" : "bg-white/10 text-white/50"
                      }`}
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {["REVEAL", "VOTING", "RESULTS", "UNMASKED"].includes(phase) && (
          <>
            {state?.prompt?.round === "BELT" && state?.belt && (
              <div className="mb-6 flex items-center justify-center gap-10">
                {state.belt.rows.map((r) => (
                  <div key={r.id} className="text-center">
                    <p className="text-3xl font-semibold text-white/70">{r.name}</p>
                    <p className="font-display text-6xl font-bold" style={{ color: GOLD }}>{r.wins}</p>
                  </div>
                ))}
              </div>
            )}
            <p className="mb-6 max-w-5xl text-4xl text-white/70">{state?.prompt?.text}</p>
            {phase === "VOTING" && (
              <p className="mb-6 font-display text-6xl font-bold" style={{ color: GOLD }}>
                Vote now on your phone
              </p>
            )}
            <div className="w-full max-w-5xl space-y-5">
              {state?.answers.map((a) => (
                <div key={a.id} className="relative overflow-hidden rounded-2xl bg-white/10 p-6 text-left">
                  {a.percent != null && (
                    <div
                      className="absolute inset-y-0 left-0 bg-[#7C3AED]/60 transition-all duration-700"
                      style={{ width: `${a.percent}%` }}
                    />
                  )}
                  <div className="relative flex items-center justify-between gap-6">
                    <span className="font-display text-5xl font-bold leading-tight">{a.text}</span>
                    {a.percent != null && (
                      <span className="shrink-0 text-5xl font-bold" style={{ color: GOLD }}>
                        {a.percent}%
                      </span>
                    )}
                  </div>
                  {a.player && (
                    <p className="relative mt-3 text-3xl font-semibold" style={{ color: GOLD }}>
                      {a.player}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {phase === "SCOREBOARD" && (
          <>
            <h1 className="mb-10 font-display text-7xl font-bold">Scoreboard</h1>
            <div className="w-full max-w-4xl space-y-4">
              {state?.scoreboard?.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between rounded-2xl bg-white/10 px-8 py-5">
                  <span className="text-4xl font-semibold">{i + 1}. {p.name}</span>
                  <span className="text-4xl font-bold" style={{ color: GOLD }}>{p.points}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {phase === "BELT_INTRO" && (
          <>
            <p className="text-4xl uppercase tracking-[0.3em] text-white/60">Belt Match</p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-10">
              {state?.belt?.rows.map((p) => (
                <span key={p.id} className="font-display text-7xl font-bold">{p.name}</span>
              ))}
            </div>
          </>
        )}

        {phase === "CHAMPION" && (
          <>
            <p className="text-4xl uppercase tracking-[0.3em] text-white/60">{name} Champion</p>
            <h1 className="mt-6 font-display text-9xl font-bold" style={{ color: GOLD }}>
              {champion?.name ?? "Champion"}
            </h1>
            <p className="mt-8 font-display text-6xl font-bold">{state?.game.beltText}</p>
          </>
        )}
      </div>
    </main>
  );
}
