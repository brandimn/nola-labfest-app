"use client";

import { useCallback, useEffect, useState } from "react";
import { shrinkImage, readFileAsDataUrl } from "@/lib/shrink-image";
import { usePost } from "@/lib/live-client";

type Player = { id: string; name: string; seatOrder: number; deviceId: string | null };
type Prompt = { id: string; round: string; text: string; sortOrder: number; isFinale: boolean; hasPhoto: boolean };
type Data = {
  game: { id: string; mode: string; name: string; beltText: string; timerSeconds: number; answerMaxLength: number };
  players: Player[];
  prompts: Prompt[];
};

export default function SetupPage() {
  const post = usePost();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [newPlayer, setNewPlayer] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/live/setup", { cache: "no-store" });
    if (r.status === 401) { setError("Sign in on the host page first, then come back."); return; }
    if (r.ok) { setData(await r.json()); setError(""); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setError(""); setNote("");
    try { await post("/api/live/setup", { action, ...extra }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "That did not work"); }
  }
  async function host(action: string, extra: Record<string, unknown> = {}) {
    setError(""); setNote("");
    try { await post("/api/live/host", { action, ...extra }); await load(); setNote("Done."); }
    catch (e) { setError(e instanceof Error ? e.message : "That did not work"); }
  }

  async function uploadPhoto(promptId: string, file: File) {
    const raw = await readFileAsDataUrl(file);
    const small = await shrinkImage(raw, 1200);
    await act("SAVE_PROMPT", { id: promptId, text: data?.prompts.find((p) => p.id === promptId)?.text ?? "", imageUrl: small });
  }

  if (error && !data) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-sm text-red-300">{error}</p>
        <a href="/live/host" className="mt-4 inline-block rounded-xl bg-[#F5A547] px-6 py-3 font-bold text-slate-900">
          Go to the host page
        </a>
      </main>
    );
  }
  if (!data) return <main className="px-4 py-16 text-center text-white/60">Loading…</main>;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-24">
      <a href="/live/host" className="text-sm text-white/60">← Host controls</a>
      <h1 className="mt-2 font-display text-2xl font-bold">Game setup</h1>
      <p className="mt-1 text-sm text-white/60">
        Currently editing the <strong>{data.game.mode === "LIVE" ? "live" : "practice"}</strong> game.
      </p>
      {error && <p className="mt-3 rounded bg-red-500/20 p-2 text-sm text-red-200">{error}</p>}
      {note && <p className="mt-3 rounded bg-green-500/20 p-2 text-sm text-green-200">{note}</p>}

      <section className="mt-5 rounded-2xl bg-white/5 p-4">
        <p className="mb-3 text-xs uppercase tracking-wider text-white/50">Names and timing</p>
        <label className="block text-sm">Game name</label>
        <input
          defaultValue={data.game.name}
          onBlur={(e) => act("SAVE_GAME", { name: e.target.value, beltText: data.game.beltText, timerSeconds: data.game.timerSeconds })}
          className="mt-1 w-full rounded-lg bg-white p-2 text-slate-900"
        />
        <p className="mt-1 text-xs text-white/50">Shows on every screen. Change it any time, even mid show.</p>

        <label className="mt-4 block text-sm">Belt text</label>
        <input
          defaultValue={data.game.beltText}
          onBlur={(e) => act("SAVE_GAME", { name: data.game.name, beltText: e.target.value, timerSeconds: data.game.timerSeconds })}
          className="mt-1 w-full rounded-lg bg-white p-2 text-slate-900"
        />

        <label className="mt-4 block text-sm">Writing timer (seconds)</label>
        <input
          type="number" defaultValue={data.game.timerSeconds}
          onBlur={(e) => act("SAVE_GAME", { name: data.game.name, beltText: data.game.beltText, timerSeconds: e.target.value })}
          className="mt-1 w-32 rounded-lg bg-white p-2 text-slate-900"
        />
      </section>

      <section className="mt-5 rounded-2xl bg-white/5 p-4">
        <p className="mb-3 text-xs uppercase tracking-wider text-white/50">
          Players ({data.players.length})
        </p>

        <div className="mb-4 flex gap-2">
          <input
            value={newPlayer}
            onChange={(e) => setNewPlayer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newPlayer.trim()) {
                act("ADD_PLAYER", { name: newPlayer.trim() });
                setNewPlayer("");
              }
            }}
            placeholder="Type a name, then press Add"
            className="flex-1 rounded-lg bg-white p-3 text-slate-900"
          />
          <button
            onClick={() => {
              if (!newPlayer.trim()) return;
              act("ADD_PLAYER", { name: newPlayer.trim() });
              setNewPlayer("");
            }}
            className="rounded-lg bg-[#F5A547] px-5 py-3 font-bold text-slate-900"
          >
            Add
          </button>
        </div>
        <div className="space-y-2">
          {data.players.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <input
                defaultValue={p.name}
                onBlur={(e) => act("SAVE_PLAYER", { id: p.id, name: e.target.value })}
                className="flex-1 rounded-lg bg-white p-2 text-slate-900"
              />
              {p.deviceId && (
                <button onClick={() => host("UNLOCK_PLAYER", { playerId: p.id })} className="rounded bg-amber-500/80 px-2 py-2 text-xs font-bold text-slate-900">
                  Unlock phone
                </button>
              )}
              <button onClick={() => act("DELETE_PLAYER", { id: p.id })} className="rounded bg-red-500/70 px-3 py-2 text-xs font-bold">
                Remove
              </button>
            </div>
          ))}
          {!data.players.length && (
            <p className="rounded-lg bg-white/5 p-3 text-sm text-white/60">
              Nothing runs until there are players. Add the six finalists above. Names can be
              changed right up to showtime, so put anything in for now.
            </p>
          )}
        </div>
      </section>

      <PromptSection
        round="R1"
        title="Round 1: Free for all"
        blurb="All six players answer. Type the prompt and press Add."
        prompts={data.prompts.filter((p) => p.round === "R1")}
        onAdd={(text) => act("ADD_PROMPT", { round: "R1", text })}
        onSave={(id, text, isFinale) => act("SAVE_PROMPT", { id, text, isFinale })}
        onDelete={(id) => act("DELETE_PROMPT", { id })}
        onMove={(id, direction) => act("MOVE_PROMPT", { id, direction })}
      />

      <PromptSection
        round="R2"
        title="Round 2: Caption this"
        blurb="Upload a photo. All six write a caption for it. No typing needed here."
        photoOnly
        prompts={data.prompts.filter((p) => p.round === "R2")}
        onAdd={(text) => act("ADD_PROMPT", { round: "R2", text })}
        onAddPhoto={async (file) => {
          const raw = await readFileAsDataUrl(file);
          const small = await shrinkImage(raw, 1200);
          await act("ADD_PROMPT", { round: "R2", text: "Caption this", imageUrl: small });
        }}
        onPhoto={uploadPhoto}
        onSave={(id, text, isFinale) => act("SAVE_PROMPT", { id, text, isFinale })}
        onDelete={(id) => act("DELETE_PROMPT", { id })}
        onMove={(id, direction) => act("MOVE_PROMPT", { id, direction })}
      />

      <PromptSection
        round="BELT"
        title="Belt Match"
        blurb="The final two players only, after both rounds. Tick Finale on the one you want played last."
        showFinale
        prompts={data.prompts.filter((p) => p.round === "BELT")}
        onAdd={(text) => act("ADD_PROMPT", { round: "BELT", text })}
        onSave={(id, text, isFinale) => act("SAVE_PROMPT", { id, text, isFinale })}
        onDelete={(id) => act("DELETE_PROMPT", { id })}
        onMove={(id, direction) => act("MOVE_PROMPT", { id, direction })}
      />

      <section className="mt-5 rounded-2xl bg-white/5 p-4">
        <p className="mb-3 text-xs uppercase tracking-wider text-white/50">Practice and reset</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => host("SET_MODE", { mode: "PRACTICE" })} className="rounded-xl bg-white/15 p-3 text-sm font-bold">
            Use practice game
          </button>
          <button onClick={() => host("SET_MODE", { mode: "LIVE" })} className="rounded-xl bg-white/15 p-3 text-sm font-bold">
            Use live game
          </button>
        </div>
        <ResetButton onConfirm={() => host("RESET_GAME")} />
      </section>

      <section className="mt-5 rounded-2xl bg-white/5 p-4">
        <h2 className="font-display text-lg font-bold">Have a look at any screen</h2>
        <p className="mt-1 text-sm text-white/60">
          Jumps the big screen straight to that moment so you can see how it looks. The game
          freezes while you do, so nothing moves on by itself. Open the big screen in another tab
          first.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {([
            ["LOBBY", "Lobby"],
            ["PROMPT", "Prompt up"],
            ["WRITING", "Writing"],
            ["REVEAL", "Answers"],
            ["VOTING", "Voting"],
            ["RESULTS", "Results"],
            ["UNMASKED", "Names"],
            ["SCOREBOARD", "Scoreboard"],
            ["BELT_INTRO", "Belt Match"],
            ["CHAMPION", "Champion"],
          ] as [string, string][]).map(([phase, label]) => (
            <button
              key={phase}
              onClick={() => host("PREVIEW", { phase })}
              className="rounded-lg bg-white/15 px-3 py-3 text-sm font-semibold"
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => host("RESUME_GAME")}
          className="mt-3 w-full rounded-xl bg-[#F5A547] p-3 font-bold text-slate-900"
        >
          Done looking, unfreeze the game
        </button>
      </section>

      <section className="mt-5 rounded-2xl bg-white/5 p-4 text-sm">
        <p className="mb-2 text-xs uppercase tracking-wider text-white/50">Links to put on QR codes</p>
        <p className="font-mono text-xs">Audience: /live/vote</p>
        <p className="font-mono text-xs">Finalists: /live/play</p>
        <p className="font-mono text-xs">Big screen: /live/screen</p>
        <a href="/live/codes" className="mt-3 inline-block rounded-xl bg-[#F5A547] px-4 py-3 font-bold text-slate-900">
          Open printable QR codes
        </a>
      </section>
    </main>
  );
}

/** In page confirm rather than a browser dialog, which is easy to dismiss by
 *  accident on a phone. */
function ResetButton({ onConfirm }: { onConfirm: () => void }) {
  const [arm, setArm] = useState(false);
  if (!arm) {
    return (
      <button onClick={() => setArm(true)} className="mt-2 w-full rounded-xl bg-red-500/70 p-3 text-sm font-bold">
        Reset game (keeps players and prompts)
      </button>
    );
  }
  return (
    <div className="mt-2 rounded-xl bg-red-500/20 p-3">
      <p className="text-sm">This wipes every answer, vote and score. Players and prompts stay.</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button onClick={() => { onConfirm(); setArm(false); }} className="rounded-lg bg-red-600 p-2 text-sm font-bold">
          Yes, reset
        </button>
        <button onClick={() => setArm(false)} className="rounded-lg bg-white/15 p-2 text-sm font-bold">
          Cancel
        </button>
      </div>
    </div>
  );
}


/** One clearly labelled block per round, in the order they are played, so there
 *  is never a question of which prompt belongs where. */
function PromptSection({
  round, title, blurb, prompts, onAdd, onAddPhoto, onPhoto, onSave, onDelete, onMove,
  photoOnly = false, showFinale = false,
}: {
  round: string;
  title: string;
  blurb: string;
  prompts: Prompt[];
  onAdd: (text: string) => void;
  onAddPhoto?: (file: File) => void;
  onPhoto?: (promptId: string, file: File) => void;
  onSave: (id: string, text: string, isFinale: boolean) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: number) => void;
  photoOnly?: boolean;
  showFinale?: boolean;
}) {
  const [text, setText] = useState("");

  return (
    <section className="mt-5 rounded-2xl bg-white/5 p-4">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <p className="mt-1 text-sm text-white/60">{blurb}</p>
      <p className="mt-1 text-xs text-white/40">
        {prompts.length} {prompts.length === 1 ? "prompt" : "prompts"}
      </p>

      {photoOnly ? (
        <label className="mt-3 block cursor-pointer rounded-xl bg-[#F5A547] p-4 text-center font-bold text-slate-900">
          + Add a photo
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && onAddPhoto) onAddPhoto(f);
              e.target.value = "";
            }}
          />
        </label>
      ) : (
        <div className="mt-3 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && text.trim()) { onAdd(text.trim()); setText(""); }
            }}
            placeholder="Type a prompt, then press Add"
            className="flex-1 rounded-lg bg-white p-3 text-slate-900"
          />
          <button
            onClick={() => { if (text.trim()) { onAdd(text.trim()); setText(""); } }}
            className="rounded-lg bg-[#F5A547] px-5 py-3 font-bold text-slate-900"
          >
            Add
          </button>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {prompts.map((p, i) => (
          <div key={p.id} className="rounded-xl bg-white/10 p-3">
            <div className="flex items-start gap-3">
              <span className="mt-2 text-sm font-bold text-white/40">{i + 1}</span>
              <div className="flex-1">
                {p.hasPhoto && (
                  <img
                    src={`/api/live/photo/${p.id}`}
                    alt=""
                    className="mb-2 max-h-32 w-auto rounded-lg"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <textarea
                  defaultValue={p.text}
                  onBlur={(e) => onSave(p.id, e.target.value, p.isFinale)}
                  rows={2}
                  className="w-full rounded-lg bg-white p-2 text-slate-900"
                />
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <button onClick={() => onMove(p.id, -1)} className="rounded bg-white/15 px-2 py-1">↑</button>
              <button onClick={() => onMove(p.id, 1)} className="rounded bg-white/15 px-2 py-1">↓</button>
              {showFinale && (
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    defaultChecked={p.isFinale}
                    onChange={(e) => onSave(p.id, p.text, e.target.checked)}
                  />
                  Finale, play last
                </label>
              )}
              {round === "R2" && onPhoto && (
                <label className="cursor-pointer rounded bg-white/15 px-2 py-1">
                  {p.hasPhoto ? "Replace photo" : "Add photo"}
                  <input
                    type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(p.id, f); e.target.value = ""; }}
                  />
                </label>
              )}
              <button onClick={() => onDelete(p.id)} className="ml-auto rounded bg-red-500/70 px-2 py-1 font-bold">
                Delete
              </button>
            </div>
          </div>
        ))}

        {!prompts.length && (
          <p className="rounded-lg bg-white/5 p-3 text-sm text-white/50">
            Nothing here yet.
          </p>
        )}
      </div>
    </section>
  );
}
