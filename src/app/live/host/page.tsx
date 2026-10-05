"use client";

import { useEffect, useState } from "react";
import { useCountdown, useLiveState, usePost } from "@/lib/live-client";

type Prompt = { id: string; round: string; text: string; sortOrder: number; used: boolean; isFinale: boolean };

export default function HostPage() {
  // fresh=1: the host must never be served a cached state after his own tap.
  const { state, offline } = useLiveState(1000, true);
  const post = usePost();
  const seconds = useCountdown(state);

  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [typeFor, setTypeFor] = useState<string | null>(null);
  const [typed, setTyped] = useState("");

  async function loadPrompts() {
    const r = await fetch("/api/live/prompts", { cache: "no-store" });
    if (r.ok) setPrompts(await r.json());
  }
  useEffect(() => { if (authed) loadPrompts(); }, [authed]);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setError("");
    try {
      await post("/api/live/host", { action, ...extra });
      if (action === "SHOW_PROMPT" || action === "RESET_GAME") loadPrompts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work");
    }
  }

  if (!authed) {
    return (
      <main className="mx-auto max-w-sm px-4 py-16">
        <h1 className="text-center font-display text-3xl font-bold">Host</h1>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          type="password"
          inputMode="numeric"
          placeholder="PIN"
          className="mt-6 w-full rounded-xl bg-white p-4 text-center text-2xl text-slate-900"
        />
        <button
          onClick={async () => {
            setError("");
            try { await post("/api/live/host", { action: "LOGIN", pin }); setAuthed(true); }
            catch (e) { setError(e instanceof Error ? e.message : "Wrong PIN"); }
          }}
          className="mt-4 w-full rounded-xl bg-[#F5A547] p-4 text-xl font-bold text-slate-900"
        >
          Go
        </button>
        {error && <p className="mt-4 text-center text-sm text-red-300">{error}</p>}
      </main>
    );
  }

  const phase = state?.phase ?? "LOBBY";
  const Btn = ({ on, children, kind = "normal" }: { on: () => void; children: React.ReactNode; kind?: "normal" | "go" | "quiet" }) => (
    <button
      onClick={on}
      className={
        "rounded-xl px-4 py-4 text-base font-bold " +
        (kind === "go" ? "bg-[#F5A547] text-slate-900"
          : kind === "quiet" ? "bg-white/10 text-white"
          : "bg-white/20 text-white")
      }
    >
      {children}
    </button>
  );

  return (
    <main className="mx-auto max-w-xl px-4 py-5 pb-24">
      <div className="flex items-center justify-between">
        <p className="font-display text-xl font-bold">{state?.game.name}</p>
        <div className="flex items-center gap-2">
          {state?.game.mode === "PRACTICE" && (
            <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-slate-900">PRACTICE</span>
          )}
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{phase}</span>
        </div>
      </div>
      {offline && <p className="mt-2 rounded bg-amber-500/20 p-2 text-center text-xs text-amber-200">Reconnecting…</p>}
      {error && <p className="mt-2 rounded bg-red-500/20 p-2 text-center text-sm text-red-200">{error}</p>}

      {/* Writing controls */}
      {phase === "WRITING" && (
        <section className="mt-4 rounded-2xl bg-white/5 p-4">
          <p className="text-center font-display text-5xl font-bold">{seconds ?? 0}s</p>
          <p className="mt-1 text-center text-sm text-white/70">
            {state?.answerCount ?? 0} of {state?.players.length ?? 0} answered
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {state?.timer.paused
              ? <Btn on={() => act("RESUME_TIMER")}>Resume</Btn>
              : <Btn on={() => act("PAUSE_TIMER")}>Pause</Btn>}
            <Btn on={() => act("ADD_TIME", { seconds: 30 })}>+30s</Btn>
            <Btn on={() => act("END_TIMER")} kind="go">End now</Btn>
          </div>
          <div className="mt-3 space-y-2">
            {state?.players.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                <span className={p.answered ? "text-[#7ddc9f]" : "text-white/60"}>
                  {p.answered ? "✓" : "○"} {p.name}
                </span>
                <button onClick={() => { setTypeFor(p.id); setTyped(""); }} className="rounded bg-white/10 px-2 py-1 text-xs">
                  Type for them
                </button>
              </div>
            ))}
          </div>
          {typeFor && (
            <div className="mt-3 rounded-xl bg-white/10 p-3">
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                maxLength={state?.game.answerMaxLength ?? 80}
                placeholder="Their answer from the index card"
                className="w-full rounded-lg bg-white p-2 text-slate-900"
              />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Btn on={() => { act("TYPE_FOR_PLAYER", { playerId: typeFor, text: typed }); setTypeFor(null); }} kind="go">Save</Btn>
                <Btn on={() => setTypeFor(null)} kind="quiet">Cancel</Btn>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Main flow */}
      <section className="mt-4 grid grid-cols-2 gap-2">
        {phase === "PROMPT" && <Btn on={() => act("START_TIMER")} kind="go">Start timer</Btn>}
        {(phase === "WRITING" || phase === "PROMPT") && <Btn on={() => act("START_REVEAL")}>Start reveal</Btn>}
        {phase === "REVEAL" && (
          <>
            <Btn on={() => act("REVEAL_NEXT")} kind="go">Reveal next answer</Btn>
            <Btn on={() => act("OPEN_VOTING")}>Open voting</Btn>
          </>
        )}
        {phase === "VOTING" && (
          <>
            <Btn on={() => act("CLOSE_VOTING")}>Close voting</Btn>
            <Btn on={() => act("SHOW_RESULTS")} kind="go">Show results</Btn>
          </>
        )}
        {phase === "RESULTS" && <Btn on={() => act("UNMASK")} kind="go">Unmask</Btn>}
        {["RESULTS", "UNMASKED"].includes(phase) && <Btn on={() => act("SHOW_SCOREBOARD")}>Scoreboard</Btn>}
        {phase === "SCOREBOARD" && <Btn on={() => act("START_BELT")} kind="go">Start Belt Match</Btn>}
        {["SCOREBOARD", "BELT_INTRO", "UNMASKED"].includes(phase) && <Btn on={() => act("LOBBY")} kind="quiet">Back to lobby</Btn>}
      </section>

      {/* Applause fallback and tie breaking */}
      {["REVEAL", "VOTING", "RESULTS"].includes(phase) && (state?.answers.length ?? 0) > 0 && (
        <section className="mt-4 rounded-2xl bg-white/5 p-3">
          <p className="mb-2 text-xs uppercase tracking-wider text-white/50">
            Pick the winner by applause (also settles a tie)
          </p>
          <div className="space-y-2">
            {state?.answers.map((a) => (
              <button
                key={a.id}
                onClick={() => act("PICK_WINNER", { answerId: a.id })}
                className="w-full rounded-lg bg-white/10 p-3 text-left text-sm"
              >
                {a.text}
                {a.votes != null && <span className="ml-2 text-white/50">({a.votes})</span>}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Belt Match */}
      {(state?.belt?.rows.length ?? 0) > 0 && (
        <section className="mt-4 rounded-2xl bg-white/5 p-4">
          <p className="mb-2 text-xs uppercase tracking-wider text-white/50">
            Belt Match, best of 3 (round {(state?.belt?.roundsPlayed ?? 0) + 1})
          </p>
          <div className="flex items-center justify-center gap-6">
            {state?.belt?.rows.map((r) => (
              <div key={r.id} className="text-center">
                <p className="font-display text-xl font-bold">{r.name}</p>
                <p className="font-display text-4xl font-bold text-[#F5A547]">{r.wins}</p>
              </div>
            ))}
          </div>
          {state?.prompt?.round === "BELT" && ["RESULTS", "UNMASKED"].includes(phase) && (
            <Btn on={() => act("AWARD_BELT_ROUND")} kind="go">Award this round</Btn>
          )}
          {(state?.belt?.roundsPlayed ?? 0) > 0 && (
            <button onClick={() => act("UNDO_BELT_ROUND")} className="mt-2 w-full rounded-lg bg-white/10 p-2 text-xs">
              Undo last round
            </button>
          )}
          {state?.belt?.clinched && (
            <p className="mt-3 rounded-lg bg-[#F5A547] p-3 text-center text-sm font-bold text-slate-900">
              {state.belt.clinched.name} has it. Crown them below, or play the third for fun.
            </p>
          )}
        </section>
      )}

      {/* Crown */}
      {(["BELT_INTRO", "SCOREBOARD"].includes(phase) || (state?.belt?.rows.length ?? 0) > 0) && (
        <section className="mt-4 rounded-2xl bg-white/5 p-3">
          <p className="mb-2 text-xs uppercase tracking-wider text-white/50">Crown the champion</p>
          <div className="grid grid-cols-2 gap-2">
            {(state?.belt?.rows.length
              ? state.belt.rows.map((r) => ({ id: r.id, name: r.name }))
              : state?.scoreboard ?? []
            ).map((p) => (
              <Btn key={p.id} on={() => act("CROWN", { playerId: p.id })}>{p.name}</Btn>
            ))}
          </div>
        </section>
      )}

      {/* Prompt list */}
      <section className="mt-5">
        <p className="mb-2 text-xs uppercase tracking-wider text-white/50">Prompts</p>
        <div className="space-y-2">
          {prompts.map((p) => (
            <button
              key={p.id}
              onClick={() => act("SHOW_PROMPT", { promptId: p.id })}
              className={`w-full rounded-lg p-3 text-left text-sm ${
                state?.prompt?.id === p.id ? "bg-[#F5A547] text-slate-900" : "bg-white/10"
              }`}
            >
              <span className="mr-2 text-xs opacity-70">{p.round}</span>
              {p.text}
            </button>
          ))}
          {!prompts.length && <p className="text-sm text-white/50">No prompts yet. Add them on the setup page.</p>}
        </div>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-2">
        <Btn on={() => act("MUTE", { muted: !state?.game.muted })} kind="quiet">
          {state?.game.muted ? "Unmute" : "Mute"}
        </Btn>
        <a href="/live/setup" className="rounded-xl bg-white/10 px-4 py-4 text-center text-base font-bold">Setup</a>
      </section>
    </main>
  );
}
