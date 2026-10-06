"use client";

import { useEffect, useRef, useState } from "react";
import { QRDisplay } from "@/components/qr-display";
import { useCountdown, useLiveState } from "@/lib/live-client";

const PURPLE = "#7C3AED";
const DEEP = "#3D1E50";
const GREEN = "#0E8C4B";
const GOLD = "#F5A547";

export default function ScreenPage() {
  const { state, offline } = useLiveState(1000);
  const seconds = useCountdown(state);
  const [started, setStarted] = useState(false);
  // Built from wherever the screen is actually served, so it is right whatever
  // address the laptop is on.
  const [voteUrl, setVoteUrl] = useState("");
  useEffect(() => setVoteUrl(`${window.location.origin}/live/vote`), []);
  const music = useRef<HTMLAudioElement | null>(null);
  const lobby = useRef<HTMLAudioElement | null>(null);
  const ding = useRef<HTMLAudioElement | null>(null);
  const lastRevealed = useRef(0);

  // Brass band under the writing timer, jazz club in the lobby. Only one plays
  // at a time, and Mute on the controller silences both.
  useEffect(() => {
    if (!started) return;
    const muted = !!state?.game.muted;
    const phase = state?.phase;

    const writing = phase === "WRITING" && !muted;
    if (music.current) {
      if (writing) music.current.play().catch(() => {});
      else { music.current.pause(); music.current.currentTime = 0; }
    }

    const inLobby = (phase === "LOBBY" || phase === "CHAMPION") && !muted;
    if (lobby.current) {
      if (inLobby) lobby.current.play().catch(() => {});
      else lobby.current.pause();
    }
  }, [state?.phase, state?.game.muted, started]);

  useEffect(() => {
    if (!started || !state) return;
    if (state.revealedCount > lastRevealed.current && !state.game.muted) {
      ding.current?.play().catch(() => {});
    }
    lastRevealed.current = state.revealedCount;
  }, [state?.revealedCount, state?.game.muted, started, state]);

  if (!started) {
    return (
      <main className="stage flex min-h-screen flex-col items-center justify-center gap-8">
        <img src="/live/title.webp" alt="" className="max-h-[50vh] w-auto max-w-[80vw] drop-shadow-2xl" />
        <p className="text-2xl font-semibold text-white/70">Tap once to let the music play</p>
        <button
          onClick={() => setStarted(true)}
          className="rounded-full px-20 py-8 font-display text-5xl font-bold text-slate-900 shadow-2xl"
          style={{ background: GOLD }}
        >
          Tap to Start
        </button>
      </main>
    );
  }

  const phase = state?.phase ?? "LOBBY";
  const total = state?.players.length ?? 0;
  const answered = state?.answerCount ?? 0;
  const pct = state?.timer.endsAt && state.game.timerSeconds
    ? Math.max(0, Math.min(1, (seconds ?? 0) / state.game.timerSeconds))
    : 1;
  const champion =
    state?.belt?.rows.find((p) => p.id === state?.championId) ??
    state?.scoreboard?.find((p) => p.id === state?.championId);

  return (
    <main className="stage relative flex h-screen flex-col overflow-hidden px-12 py-6">
      <audio ref={music} src="/game/sounds/thinking.mp3" loop preload="auto" />
      <audio ref={lobby} src="/game/sounds/lobby.mp3" loop preload="auto" />
      <audio ref={ding} src="/game/sounds/ding.mp3" preload="auto" />

      <div className="beads" />

      <header className="relative flex items-center justify-between">
        <img
          src="/live/title.webp"
          alt=""
          className={`h-16 w-auto drop-shadow-lg ${phase === "LOBBY" ? "invisible" : ""}`}
        />
        <div className="flex items-center gap-3">
          {state?.game.mode === "PRACTICE" && (
            <span className="rounded-full bg-amber-400 px-5 py-2 text-xl font-bold text-slate-900">PRACTICE</span>
          )}
          {offline && <span className="rounded-full bg-red-500 px-5 py-2 text-xl font-bold">Reconnecting</span>}
        </div>
      </header>

      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        {phase === "LOBBY" && (
          <>
            <img
              src="/live/title.webp"
              alt=""
              className="max-h-[52vh] w-auto max-w-[80vw] drop-shadow-2xl"
            />
            <div className="mt-6 flex items-center justify-center gap-12">
              {voteUrl && (
                <div className="rounded-3xl bg-white p-5 shadow-2xl">
                  <QRDisplay value={voteUrl} size={240} />
                </div>
              )}
              <div className="text-left">
                <p className="font-display text-6xl font-black" style={{ color: GOLD }}>Scan to vote</p>
                <p className="mt-2 text-3xl font-semibold text-white/80">No app. No password.</p>
                <p className="mt-1 text-3xl font-semibold text-white/80">Just point your camera.</p>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              {state?.players.map((p) => (
                <span key={p.id} className="chip rounded-2xl px-10 py-5 text-4xl font-bold">{p.name}</span>
              ))}
            </div>
            {!state?.players.length && (
              <p className="mt-6 text-3xl font-semibold text-white/50">
                Waiting on the lineup. Add the players in Setup.
              </p>
            )}
          </>
        )}

        {(phase === "PROMPT" || phase === "WRITING") && (
          <>
            {state?.prompt?.photo && (
              <img src={state.prompt.photo} alt="" className="mb-8 max-h-[36vh] rounded-3xl shadow-2xl" />
            )}
            <h1 className="pop max-w-6xl font-display text-[5.5rem] font-black leading-[1.05] drop-shadow-lg">
              {state?.prompt?.text}
            </h1>

            {phase === "WRITING" && (
              <>
                <div className="relative mt-10 h-56 w-56">
                  <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="12" />
                    <circle
                      cx="60" cy="60" r="52" fill="none" strokeWidth="12" strokeLinecap="round"
                      stroke={pct > 0.25 ? GOLD : "#ef4444"}
                      strokeDasharray={2 * Math.PI * 52}
                      strokeDashoffset={2 * Math.PI * 52 * (1 - pct)}
                      style={{ transition: "stroke-dashoffset 0.4s linear, stroke 0.4s" }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center font-display text-7xl font-black">
                    {seconds ?? 0}
                  </span>
                </div>

                <p className="mt-6 text-4xl font-bold text-white/85">{answered} of {total} answered</p>
                <div className="mt-5 flex flex-wrap justify-center gap-4">
                  {state?.players.map((p) => (
                    <span
                      key={p.id}
                      className={`rounded-2xl px-8 py-4 text-3xl font-bold transition-all duration-300 ${
                        p.answered ? "scale-105 text-white shadow-lg" : "text-white/40"
                      }`}
                      style={{ background: p.answered ? GREEN : "rgba(255,255,255,0.08)" }}
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
              <div className="mb-6 flex items-center justify-center gap-14">
                {state.belt.rows.map((r) => (
                  <div key={r.id}>
                    <p className="text-3xl font-bold text-white/70">{r.name}</p>
                    <p className="font-display text-7xl font-black" style={{ color: GOLD }}>{r.wins}</p>
                  </div>
                ))}
              </div>
            )}

            <p className="mb-8 max-w-5xl text-4xl font-semibold text-white/75">{state?.prompt?.text}</p>

            {phase === "VOTING" && (
              <p className="blink mb-8 font-display text-7xl font-black" style={{ color: GOLD }}>
                Vote now on your phone
              </p>
            )}
            {phase === "VOTING" && voteUrl && (
              <div className="absolute bottom-6 right-6 rounded-2xl bg-white p-3 text-center shadow-xl">
                <QRDisplay value={voteUrl} size={130} />
                <p className="mt-1 text-xs font-bold text-slate-700">Just joined? Scan</p>
              </div>
            )}

            <div className="w-full max-w-6xl space-y-5">
              {state?.answers.map((a, i) => (
                <div
                  key={a.id}
                  className="fly relative overflow-hidden rounded-3xl p-7 text-left shadow-xl"
                  style={{ background: "rgba(255,255,255,0.1)", animationDelay: `${i * 60}ms` }}
                >
                  {a.percent != null && (
                    <div
                      className="absolute inset-y-0 left-0"
                      style={{
                        width: `${a.percent}%`,
                        background: `linear-gradient(90deg, ${PURPLE}, ${GREEN})`,
                        transition: "width 1.2s cubic-bezier(.2,.8,.2,1)",
                      }}
                    />
                  )}
                  <div className="relative flex items-center justify-between gap-8">
                    <span className="font-display text-5xl font-black leading-tight">{a.text}</span>
                    {a.percent != null && (
                      <span className="shrink-0 font-display text-6xl font-black" style={{ color: GOLD }}>
                        {a.percent}%
                      </span>
                    )}
                  </div>
                  {a.player && (
                    <p className="pop relative mt-3 text-4xl font-black" style={{ color: GOLD }}>
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
            <h1 className="mb-10 font-display text-8xl font-black drop-shadow-lg">Scoreboard</h1>
            <div className="w-full max-w-4xl space-y-4">
              {state?.scoreboard?.map((p, i) => (
                <div
                  key={p.id}
                  className="fly flex items-center justify-between rounded-3xl px-10 py-6"
                  style={{
                    background: i === 0 ? GOLD : "rgba(255,255,255,0.1)",
                    color: i === 0 ? "#0F172A" : "white",
                    animationDelay: `${i * 80}ms`,
                  }}
                >
                  <span className="text-5xl font-black">{i + 1}. {p.name}</span>
                  <span className="text-5xl font-black">{p.points}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {phase === "BELT_INTRO" && (
          <>
            <p className="text-5xl font-bold uppercase tracking-[0.3em] text-white/60">Belt Match</p>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-16">
              {state?.belt?.rows.map((p) => (
                <span key={p.id} className="pop font-display text-8xl font-black drop-shadow-lg">{p.name}</span>
              ))}
            </div>
          </>
        )}

        {phase === "CHAMPION" && (
          <>
            {[...Array(60)].map((_, i) => (
              <span
                key={i}
                className="confetti"
                style={{
                  left: `${(i * 37) % 100}%`,
                  background: [GOLD, PURPLE, GREEN][i % 3],
                  animationDelay: `${(i % 20) * 0.15}s`,
                }}
              />
            ))}
            <p className="text-4xl font-bold uppercase tracking-[0.3em] text-white/70">Champion</p>
            <h1 className="pop mt-6 font-display text-[9rem] font-black leading-none drop-shadow-2xl" style={{ color: GOLD }}>
              {champion?.name ?? "Champion"}
            </h1>
            <p className="mt-8 font-display text-7xl font-black">{state?.game.beltText}</p>
          </>
        )}
      </div>

      <style>{`
        .stage {
          background:
            radial-gradient(1200px 700px at 15% -10%, rgba(124,58,237,0.55), transparent 60%),
            radial-gradient(1000px 600px at 90% 10%, rgba(14,140,75,0.40), transparent 60%),
            radial-gradient(900px 600px at 50% 110%, rgba(245,165,71,0.35), transparent 60%),
            ${DEEP};
        }
        .beads {
          position: absolute; inset: 0 0 auto 0; height: 10px;
          background: repeating-linear-gradient(90deg, ${PURPLE} 0 60px, ${GOLD} 60px 120px, ${GREEN} 120px 180px);
        }
        .chip { background: rgba(255,255,255,0.12); }
        @keyframes fly { from { opacity: 0; transform: translateY(28px) scale(0.97); } to { opacity: 1; transform: none; } }
        .fly { animation: fly 0.45s cubic-bezier(.2,.8,.2,1) both; }
        @keyframes pop { 0% { transform: scale(0.9); opacity: 0; } 60% { transform: scale(1.03); } 100% { transform: scale(1); opacity: 1; } }
        .pop { animation: pop 0.5s cubic-bezier(.2,.8,.2,1) both; }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }
        .blink { animation: blink 1.4s ease-in-out infinite; }
        @keyframes fall { to { transform: translateY(110vh) rotate(720deg); } }
        .confetti {
          position: absolute; top: -5vh; width: 14px; height: 22px; border-radius: 3px;
          animation: fall 3.2s linear infinite;
        }
      `}</style>
    </main>
  );
}
