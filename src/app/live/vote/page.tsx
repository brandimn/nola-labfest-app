"use client";

import { useEffect, useState } from "react";
import { deviceId, useLiveState, usePost } from "@/lib/live-client";

export default function VotePage() {
  const { state, offline } = useLiveState(2000);
  const post = usePost();
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const promptId = state?.prompt?.id ?? null;

  // A fresh prompt means a fresh vote.
  useEffect(() => {
    setVotedFor(null);
    setError("");
    if (!promptId) return;
    fetch(`/api/live/vote?deviceId=${encodeURIComponent(deviceId())}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (d.voted) setVotedFor(d.answerId); })
      .catch(() => {});
  }, [promptId]);

  async function vote(answerId: string) {
    setBusy(true); setError("");
    try {
      await post("/api/live/vote", { deviceId: deviceId(), answerId });
      setVotedFor(answerId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not count that vote");
    } finally {
      setBusy(false);
    }
  }

  const name = state?.game.name ?? "LabFest";
  const voting = state?.phase === "VOTING";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.3em] text-[#F5A547]">
        {name}
      </p>

      {offline && (
        <p className="mt-3 rounded-lg bg-amber-500/20 p-2 text-center text-xs text-amber-200">
          Trouble reaching the game. Still trying.
        </p>
      )}

      {!voting && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <img
            src={votedFor ? "/live/tooth/thumbs.png" : "/live/tooth/question.png"}
            alt=""
            className="mb-4 h-40 w-auto drop-shadow-xl"
          />
          <p className="font-display text-3xl font-bold">Hang tight</p>
          <p className="mt-2 text-sm text-white/70">
            {votedFor ? "Vote counted. Next one coming up." : "Voting opens in a moment."}
          </p>
        </div>
      )}

      {voting && (
        <>
          {state?.prompt?.photo && (
            <img
              src={state.prompt.photo}
              alt=""
              className="mt-4 w-full rounded-xl shadow-lg"
            />
          )}
          <p className="mt-3 text-center font-display text-xl font-bold leading-snug">
            {state?.prompt?.text}
          </p>
          {votedFor ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <img src="/live/tooth/cheer.png" alt="" className="mb-4 h-40 w-auto drop-shadow-xl" />
              <p className="font-display text-3xl font-bold text-[#0E8C4B]">Vote counted</p>
              <p className="mt-2 text-sm text-white/70">Look at the big screen.</p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {state?.answers.map((a) => (
                <button
                  key={a.id}
                  disabled={busy}
                  onClick={() => vote(a.id)}
                  className="w-full rounded-2xl bg-white/10 p-4 text-left text-lg font-semibold leading-snug active:scale-[0.98] disabled:opacity-50"
                >
                  {a.text}
                </button>
              ))}
              {state?.answers.length === 0 && (
                <p className="text-center text-sm text-white/60">Waiting for the answers.</p>
              )}
            </div>
          )}
          {error && <p className="mt-3 text-center text-sm text-red-300">{error}</p>}
        </>
      )}
    </main>
  );
}
