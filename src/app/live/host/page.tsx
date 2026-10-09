"use client";

import { useEffect, useState } from "react";
import { useCountdown, useLiveState, usePost, type LiveState } from "@/lib/live-client";
import { ROUNDS, ROUND_NOTES, ROUND_TITLES } from "@/lib/live-rounds";

type Prompt = { id: string; round: string; text: string; sortOrder: number; used: boolean; isFinale: boolean };

// One button, named after whatever it is about to do, so the operator never has
// to work out which control applies right now.
const NEXT_LABEL: Record<string, string> = {
  LOBBY: "Start the game",
  PROMPT: "Open writing",
  WRITING: "Call time",
  REVEAL: "Open voting",
  VOTING: "Show results",
  RESULTS: "Reveal the names",
  UNMASKED: "Scoreboard",
  SCOREBOARD: "Next prompt",
  BELT_INTRO: "First belt prompt",
  CHAMPION: "Back to lobby",
};

const NEXT_HINT: Record<string, string> = {
  LOBBY: "Puts the first prompt on the big screen",
  PROMPT: "It opens on its own in a few seconds anyway",
  WRITING: "Only if you do not want to wait for everyone",
  REVEAL: "Opens by itself once every answer is up",
  VOTING: "Opens results by itself once the votes stop",
  RESULTS: "Names appear by themselves in a moment",
  UNMASKED: "Shows the running scores",
  SCOREBOARD: "Moves to the next prompt in your list",
  BELT_INTRO: "Starts the head to head",
  CHAMPION: "Resets the big screen",
};

/** Says, in plain words, what is on the projector right now.
 *
 *  The operator runs the show from a phone while the big screen is across the
 *  room and often behind them. Without this they have to turn round and squint
 *  to know whether the answers have finished appearing or the vote is still
 *  open. Nothing here is a control; it is a mirror.
 *
 *  liveVotes comes from the operator's own vote poll, because the shared state
 *  deliberately hides vote counts until the results are up and the big screen
 *  must not leak them early. */
function RoomSees({
  state,
  seconds,
  liveVotes,
}: {
  state: LiveState | null;
  seconds: number | null;
  liveVotes: number;
}) {
  if (!state) {
    return (
      <div className="mt-4 rounded-2xl border border-white/15 bg-black/30 p-4 text-center text-sm text-white/50">
        Waiting for the big screen…
      </div>
    );
  }

  // Only the finalists are still playing in the Belt Match, so the count has to
  // be out of them and not out of everyone who started the night.
  const inPlay =
    state.prompt?.round === "BELT" && state.beltFinalists.length
      ? state.players.filter((p) => state.beltFinalists.includes(p.id))
      : state.players;
  const players = inPlay.length;
  const answeredNow = inPlay.filter((p) => p.answered).length;
  const joined = state.players.filter((p) => p.claimed).length;
  const shown = Math.min(state.revealedCount, state.revealTotal);
  const champion =
    state.belt?.rows.find((p) => p.id === state.championId) ??
    state.scoreboard?.find((p) => p.id === state.championId);
  const winner = [...state.answers].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0))[0];

  let headline = "";
  let detail = "";

  switch (state.phase) {
    case "LOBBY":
      headline = "Title card and the Join code";
      detail = `${joined} of ${players} players have picked their name`;
      break;
    case "PROMPT":
      headline = "The question, big. Nobody can type yet";
      detail =
        state.getReadyIn && state.getReadyIn > 0
          ? `Writing opens in ${state.getReadyIn}s`
          : "Writing is about to open";
      break;
    case "WRITING":
      headline = "The question and the clock";
      detail = `${seconds ?? 0}s left, ${answeredNow} of ${players} answered`;
      break;
    case "REVEAL":
      headline = "Answers appearing one at a time, no names yet";
      detail = state.revealDone
        ? "All of them are up, the vote is opening"
        : `${shown} of ${state.revealTotal} shown`;
      break;
    case "VOTING":
      headline = "Every answer, and the QR code to vote";
      detail = liveVotes === 1 ? "1 vote in so far" : `${liveVotes} votes in so far`;
      break;
    case "RESULTS":
      headline = "The bars filling in with the votes";
      detail = winner
        ? `Winning answer: ${winner.text}`
        : `${state.totalVotes ?? 0} votes counted`;
      break;
    case "UNMASKED":
      headline = "Same answers, now with the names on them";
      detail = winner?.player ? `${winner.player} took that one` : "";
      break;
    case "SCOREBOARD":
      headline = "The running scores";
      detail = "Next tap starts the Belt Match";
      break;
    case "BELT_INTRO":
      headline = "The final two, head to head";
      detail = state.belt?.rows.map((r) => `${r.name} ${r.wins}`).join("   ") ?? "";
      break;
    case "CHAMPION":
      headline = "The champion with the belt";
      detail = champion?.name ? `${champion.name} wins it` : "";
      break;
    default:
      headline = state.phase;
  }

  return (
    <div className="mt-4 rounded-2xl border border-white/15 bg-black/30 p-4">
      <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">
        On the big screen
      </p>
      <p className="mt-1 font-display text-lg font-bold leading-tight">{headline}</p>
      {detail && <p className="mt-1 text-sm text-white/70">{detail}</p>}
      {state.prompt && ["PROMPT", "WRITING", "REVEAL", "VOTING", "RESULTS", "UNMASKED"].includes(state.phase) && (
        <p className="mt-2 border-t border-white/10 pt-2 text-sm italic text-white/60">
          {state.prompt.photo ? "Photo up. " : ""}
          {state.prompt.text}
        </p>
      )}
      {state.game.muted && (
        <p className="mt-2 text-xs font-bold text-amber-300">Sound is muted</p>
      )}
    </div>
  );
}

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
  // Counts for the operator only, so he knows whether anyone has voted before
  // calling results. Never part of the shared state the big screen reads.
  const [votes, setVotes] = useState<{ total: number; byAnswer: Record<string, number> }>({
    total: 0, byAnswer: {},
  });

  async function loadPrompts() {
    const r = await fetch("/api/live/prompts", { cache: "no-store" });
    if (r.ok) setPrompts(await r.json());
  }
  // Already signed in from earlier? Then do not ask again. The marker cookie
  // lasts a day, but this page kept its own idea of being signed in in memory
  // only, so a phone reloading the tab mid show, which Safari does whenever it
  // feels like it, dropped the operator back to the PIN pad with the room
  // waiting. Any host-only endpoint answers the question.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/live/setup", { cache: "no-store" })
      .then((r) => { if (!cancelled && r.ok) setAuthed(true); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Keep the list in step with the show. NEXT is what moves the game on and
  // marks a prompt played, so watching the current prompt change catches every
  // route to it, including the game advancing itself on a timer.
  useEffect(() => {
    if (authed) loadPrompts();
  }, [authed, state?.prompt?.id, state?.phase]);

  useEffect(() => {
    if (!authed) return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch("/api/live/votes", { cache: "no-store" });
        if (r.ok) setVotes(await r.json());
      } catch { /* keep the last count */ }
      if (!stop) setTimeout(tick, 1200);
    };
    tick();
    return () => { stop = true; };
  }, [authed]);

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
        <h1 className="text-center font-display text-3xl font-bold">Game controls</h1>
        <p className="mt-2 text-center text-sm text-white/60">For whoever is running the game, not the person on the mic.</p>
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
  // In the Belt Match only the finalists are still writing, so counting against
  // everyone who started the night meant "everyone is in" could never be true
  // and the clock looked stuck waiting on people who were already out.
  const stillPlaying =
    state?.prompt?.round === "BELT" && state.beltFinalists.length
      ? state.players.filter((p) => state.beltFinalists.includes(p.id))
      : state?.players ?? [];
  const answeredCount = stillPlaying.filter((p) => p.answered).length;
  // The Belt Match is running once finalists are set, which is the only thing
  // that unlocks the belt questions.
  const beltStarted = (state?.beltFinalists.length ?? 0) > 0;
  const everyoneAnswered = stillPlaying.length > 0 && answeredCount === stillPlaying.length;
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
      {state?.autoPaused && (
        <div className="mt-2 rounded-xl bg-amber-500/25 p-3 text-center text-sm">
          <p className="font-bold">Frozen while you look at a screen.</p>
          <button
            onClick={() => act("RESUME_GAME")}
            className="mt-2 rounded-lg bg-[#F5A547] px-4 py-2 font-bold text-slate-900"
          >
            Unfreeze
          </button>
        </div>
      )}
      {error && <p className="mt-2 rounded bg-red-500/20 p-2 text-center text-sm text-red-200">{error}</p>}

      {/* The one button. Everything below it is an override, not a step. */}
      <button
        onClick={() => act("NEXT")}
        className="mt-4 w-full rounded-2xl bg-[#F5A547] px-4 py-7 text-center font-display text-3xl font-black text-slate-900 shadow-lg active:scale-[0.99]"
      >
        {NEXT_LABEL[phase] ?? "Next"}
      </button>
      <p className="mt-2 text-center text-sm text-white/60">{NEXT_HINT[phase] ?? ""}</p>

      {/* What the projector is showing, in words, so the operator never has to
          look up at it to know where the show is. */}
      <RoomSees state={state} seconds={seconds} liveVotes={votes.total} />


      {/* Writing controls */}
      {phase === "WRITING" && (
        <section className="mt-4 rounded-2xl bg-white/5 p-4">
          <p className="text-center font-display text-5xl font-bold">{seconds ?? 0}s</p>
          <p className="mt-1 text-center text-sm text-white/70">
            {answeredCount} of {stillPlaying.length} answered
          </p>
          {everyoneAnswered && (
            <p className="mt-2 rounded-lg bg-[#0E8C4B]/30 p-2 text-center text-sm font-bold">
              Everyone is in. The clock stopped itself.
            </p>
          )}
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

      {phase === "PROMPT" && (
        <div className="mt-4 rounded-2xl bg-[#F5A547]/20 p-4 text-center text-sm">
          <p className="font-bold">
            {state?.getReadyIn ? `Writing opens in ${state.getReadyIn}` : "Writing is opening"}
          </p>
          <p className="mt-1 text-white/80">
            Read the prompt out. Nothing to tap.
          </p>
        </div>
      )}

      {!state?.players.length && (
        <div className="mt-4 rounded-2xl bg-amber-500/20 p-4 text-sm">
          <p className="font-bold">No players yet.</p>
          <p className="mt-1 text-white/80">
            Tap Setup below and add the six finalists. Nothing else works until there are players.
          </p>
        </div>
      )}

      {/* Main flow */}
      <section className="mt-4 grid grid-cols-2 gap-2">
        {phase === "PROMPT" && (
          <Btn on={() => act("START_TIMER")} kind="quiet">Start writing now</Btn>
        )}
        {phase === "WRITING" && (
          <Btn on={() => act("START_REVEAL")} kind={everyoneAnswered ? "go" : "quiet"}>
            {everyoneAnswered ? "Reveal now" : "Skip to reveal"}
          </Btn>
        )}
        {phase === "REVEAL" && (
          <>
            {!state?.revealDone ? (
              <Btn on={() => act("REVEAL_NEXT")} kind="quiet">Skip ahead</Btn>
            ) : (
              <span className="rounded-xl bg-white/5 px-4 py-4 text-center text-sm text-white/50">
                Opening the vote…
              </span>
            )}
            <Btn on={() => act("OPEN_VOTING")} kind="quiet">Open voting now</Btn>
          </>
        )}
        {phase === "VOTING" && (
          <Btn on={() => act("SHOW_RESULTS")} kind="quiet">Show results now</Btn>
        )}
        {phase === "RESULTS" && <Btn on={() => act("UNMASK")} kind="quiet">Unmask now</Btn>}
        {["RESULTS", "UNMASKED"].includes(phase) && <Btn on={() => act("SHOW_SCOREBOARD")}>Scoreboard</Btn>}
        {phase === "SCOREBOARD" && <Btn on={() => act("START_BELT")} kind="go">Start Belt Match</Btn>}
        {["SCOREBOARD", "BELT_INTRO", "UNMASKED"].includes(phase) && <Btn on={() => act("LOBBY")} kind="quiet">Back to lobby</Btn>}
      </section>

      {/* Who is going into the Belt Match, before it starts. The arithmetic
          sends the top two through, three on a straight tie for second, but a
          wider tie falls back to the top two and the second seat then goes on
          alphabetical order. That is no way to settle a finale in front of a
          room that just watched three people score the same, so it can be
          overruled here. */}
      {phase === "SCOREBOARD" && state?.scoreboard && (
        <section className="mt-4 rounded-2xl border border-[#F5A547]/40 bg-white/5 p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">
            Going into the Belt Match
          </p>
          <p className="mt-1 text-sm text-white/70">
            {state.beltPickedByHost
              ? "Your pick. Tap a name to change it."
              : "Picked on points. Tap a name to overrule it."}
          </p>
          <div className="mt-3 space-y-2">
            {state.scoreboard.map((p) => {
              const inFinal = state.beltProposed.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    const next = inFinal
                      ? state.beltProposed.filter((id) => id !== p.id)
                      : [...state.beltProposed, p.id];
                    if (next.length < 2 || next.length > 3) {
                      setError(
                        next.length < 2
                          ? "The Belt Match needs two. Tap someone else in first."
                          : "Three is the most it takes. Tap one out first."
                      );
                      return;
                    }
                    setError("");
                    act("SET_FINALISTS", { playerIds: next });
                  }}
                  className={`flex w-full items-center justify-between rounded-lg p-3 text-left ${
                    inFinal ? "bg-[#F5A547] text-slate-900" : "bg-white/10 text-white/70"
                  }`}
                >
                  <span className="font-bold">{p.name}</span>
                  <span className="text-sm font-semibold">
                    {p.points}
                    {inFinal ? " • in" : ""}
                  </span>
                </button>
              );
            })}
          </div>
          {state.beltPickedByHost && (
            <button
              onClick={() => act("CLEAR_FINALISTS")}
              className="mt-3 w-full rounded-lg bg-white/10 p-2 text-sm font-bold"
            >
              Go back to what the points say
            </button>
          )}
        </section>
      )}

      {phase === "REVEAL" && (
        <p className="mt-3 text-center text-sm text-white/60">
          Revealing on its own, {state?.revealedCount ?? 0} of {state?.revealTotal ?? 0} shown.
          Voting opens by itself when they are all up.
        </p>
      )}
      {phase === "WRITING" && everyoneAnswered && (
        <p className="mt-3 text-center text-sm text-white/60">
          Answers start showing in a moment. Nothing to tap.
        </p>
      )}
      {phase === "VOTING" && (
        <section className="mt-3 rounded-2xl bg-white/5 p-4 text-center">
          <p className="font-display text-5xl font-black" style={{ color: "#F5A547" }}>
            {votes.total}
          </p>
          <p className="text-sm text-white/70">
            {votes.total === 1 ? "vote in" : "votes in"}. Only you can see this.
          </p>
          {votes.total === 0 ? (
            <p className="mt-2 rounded-lg bg-amber-500/20 p-2 text-sm">
              Nobody has voted yet. Waiting for the first vote.
            </p>
          ) : (
            <p className="mt-2 text-sm text-white/60">
              Results show themselves once the votes stop coming in.
            </p>
          )}
        </section>
      )}

      {phase === "RESULTS" && (
        <p className="mt-3 text-center text-sm text-white/60">
          Names appear in a moment. Nothing to tap.
        </p>
      )}
      {phase === "UNMASKED" && (
        <p className="mt-3 text-center text-sm text-white/60">
          That is the prompt done. Pick the next one below, or show the scoreboard.
        </p>
      )}

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
                <span className="ml-2 text-white/50">
                  ({a.votes ?? votes.byAnswer[a.id] ?? 0})
                </span>
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

      {/* Prompt list, in the order they are played and grouped the same way as
          the setup page, so there is never a doubt which round is which. */}
      <section className="mt-5">
        <p className="mb-2 text-xs uppercase tracking-wider text-white/50">Prompts</p>
        {!prompts.length && (
          <p className="text-sm text-white/50">No prompts yet. Add them on the setup page.</p>
        )}
        {ROUNDS.map((round) => {
          const inRound = prompts.filter((p) => p.round === round);
          if (!inRound.length) return null;
          return (
            <div key={round} className="mt-4">
              <p className="font-display text-lg font-bold text-[#F5A547]">{ROUND_TITLES[round]}</p>
              <p className="mb-2 text-xs text-white/50">{ROUND_NOTES[round]}</p>
              {/* Belt questions stay locked until the Belt Match is started, so
                  they cannot be played as ordinary rounds. Doing that leaves the
                  game with no finalists, nothing to award and no champion, which
                  is how the five player run through ended with no ending. */}
              {round === "BELT" && !beltStarted && (
                <p className="mb-2 rounded-lg bg-amber-500/20 p-2 text-xs text-amber-200">
                  Locked until you tap Start Belt Match on the scoreboard. Then these
                  come up on their own.
                </p>
              )}
              <div className="space-y-2">
                {inRound.map((p) => {
                  const locked = round === "BELT" && !beltStarted;
                  return (
                  <button
                    key={p.id}
                    disabled={locked}
                    onClick={() => act("SHOW_PROMPT", { promptId: p.id })}
                    className={`w-full rounded-lg p-3 text-left text-sm ${
                      locked
                        ? "cursor-not-allowed bg-white/5 text-white/30"
                        : state?.prompt?.id === p.id
                          ? "bg-[#F5A547] text-slate-900"
                          : p.used
                            ? "bg-white/5 text-white/40"
                            : "bg-white/10"
                    }`}
                  >
                    {p.text}
                    {p.isFinale && (
                      <span className="ml-2 rounded-full bg-[#7C3AED] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        Finale
                      </span>
                    )}
                    {p.used && state?.prompt?.id !== p.id && (
                      <span className="ml-2 text-xs">done</span>
                    )}
                  </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-6 grid grid-cols-2 gap-2">
        <Btn on={() => act("MUTE", { muted: !state?.game.muted })} kind="quiet">
          {state?.game.muted ? "Unmute" : "Mute"}
        </Btn>
        <a href="/live/setup" className="rounded-xl bg-white/10 px-4 py-4 text-center text-base font-bold">
          Setup
        </a>
      </section>

      {/* Everything else lives on another screen, and typing addresses on a
          phone is miserable. */}
      <section className="mt-3">
        <p className="mb-2 text-xs uppercase tracking-wider text-white/50">Open another screen</p>
        <div className="grid grid-cols-2 gap-2">
          <a
            href="/live/screen"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-[#F5A547] px-3 py-4 text-center text-sm font-bold text-slate-900"
          >
            Big screen
          </a>
          <a href="/live/codes" className="rounded-xl bg-white/15 px-3 py-4 text-center text-sm font-bold">
            QR codes
          </a>
          <a
            href="/live/play"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-white/15 px-3 py-4 text-center text-sm font-bold"
          >
            Player view
          </a>
          <a
            href="/live/vote"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-white/15 px-3 py-4 text-center text-sm font-bold"
          >
            Voting view
          </a>
        </div>
        <a href="/admin" className="mt-2 block rounded-xl bg-white/10 px-3 py-3 text-center text-sm font-semibold">
          Back to admin
        </a>
      </section>
    </main>
  );
}
