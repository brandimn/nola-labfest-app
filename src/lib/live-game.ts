import { prisma } from "@/lib/prisma";

export const PHASES = [
  "LOBBY", "PROMPT", "WRITING", "REVEAL", "VOTING",
  "RESULTS", "UNMASKED", "SCOREBOARD", "BELT_INTRO", "CHAMPION",
] as const;
export type Phase = (typeof PHASES)[number];

/** Answers are only ever attributed once the host has unmasked. Before that the
 *  author is absent from the payload entirely, not just hidden on screen, so it
 *  cannot be read out of the network response. */
export const ATTRIBUTED_PHASES: Phase[] = ["UNMASKED", "SCOREBOARD", "BELT_INTRO", "CHAMPION"];

/** The one game of a given mode, created on first use. Practice and live are
 *  separate rows, so a rehearsal can never touch the real show. */
export async function getOrCreateGame(mode: "PRACTICE" | "LIVE") {
  const existing = await prisma.game.findFirst({ where: { mode } });
  if (existing) return existing;
  const game = await prisma.game.create({ data: { mode } });
  await prisma.gameState.create({ data: { gameId: game.id } });
  return game;
}

/** Whichever game is currently being driven. Live wins if one exists and has
 *  been started; otherwise practice. The host switches modes explicitly. */
export async function getActiveGame() {
  const live = await prisma.game.findFirst({ where: { mode: "LIVE" } });
  if (live) return live;
  return getOrCreateGame("PRACTICE");
}

export async function getState(gameId: string) {
  const state = await prisma.gameState.findUnique({ where: { gameId } });
  if (state) return state;
  return prisma.gameState.create({ data: { gameId } });
}

/** Points are the share of the vote on each prompt, so 40% of the vote is 40
 *  points. A blank answer scores nothing. */
export async function scoreboardFor(gameId: string) {
  const players = await prisma.gamePlayer.findMany({
    where: { gameId },
    orderBy: { seatOrder: "asc" },
    select: { id: true, name: true, photoUrl: true },
  });

  const prompts = await prisma.gamePrompt.findMany({
    where: { gameId, round: { in: ["R1", "R2"] } },
    select: { id: true },
  });
  const promptIds = prompts.map((p) => p.id);

  const totals = new Map(players.map((p) => [p.id, 0]));
  if (promptIds.length) {
    const answers = await prisma.gameAnswer.findMany({
      where: { promptId: { in: promptIds } },
      select: { id: true, promptId: true, playerId: true, _count: { select: { votes: true } } },
    });
    const perPrompt = new Map<string, number>();
    for (const a of answers) {
      perPrompt.set(a.promptId, (perPrompt.get(a.promptId) ?? 0) + a._count.votes);
    }
    for (const a of answers) {
      const total = perPrompt.get(a.promptId) ?? 0;
      if (!total) continue;
      const share = (a._count.votes / total) * 100;
      totals.set(a.playerId, (totals.get(a.playerId) ?? 0) + share);
    }
  }

  return players
    .map((p) => ({ ...p, points: Math.round(totals.get(p.id) ?? 0) }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}

/** Top two advance. If second place is tied, everyone tied goes through, so a
 *  three way Belt Match is the tiebreaker rather than an extra round. */
export function beltFinalistsFrom(board: { id: string; points: number }[]) {
  if (board.length <= 2) return board.map((p) => p.id);
  const cutoff = board[1].points;
  const through = board.filter((p, i) => i === 0 || p.points >= cutoff);
  // A tie for second lets a third through, which the Belt Match is built for.
  // Any more than that is not a tie worth honouring: it means hardly anybody
  // voted and the whole table is sitting on the same score, and without this
  // cap all six players went into a head to head meant for two. A dry run with
  // no votes hit it every time, and a thin crowd on the night would too.
  return (through.length > 3 ? board.slice(0, 2) : through).map((p) => p.id);
}

/** Best of three. Wins are counted from the ordered list of round winners, so
 *  the host can award a round and the score is derived rather than tracked in
 *  two places. */
export function beltStanding(
  finalists: { id: string; name: string }[],
  winners: string[]
) {
  const rows = finalists.map((f) => ({
    ...f,
    wins: winners.filter((w) => w === f.id).length,
  }));
  const top = rows.reduce((best, r) => (r.wins > best ? r.wins : best), 0);
  // Two wins takes it in a head to head. With three finalists a clear lead
  // after three rounds is enough, which is why the host still confirms.
  const clinched = top >= 2 ? rows.find((r) => r.wins === top) ?? null : null;
  return { rows: rows.sort((a, b) => b.wins - a.wins), clinched, roundsPlayed: winners.length };
}

export function shuffled<T>(items: T[]) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Answers appear on their own, a beat apart, once the reveal starts. Derived
 *  from one timestamp rather than ticked forward by whoever is watching, so
 *  every screen shows the same thing and a refresh lands in the right place. */
export const REVEAL_GAP_MS = 2200;

export function revealedSoFar(startedAt: Date | null, total: number, now = Date.now()) {
  if (!startedAt) return 0;
  const elapsed = now - startedAt.getTime();
  return Math.max(0, Math.min(total, Math.floor(elapsed / REVEAL_GAP_MS) + 1));
}

/** Beats where the game has nothing to decide, so it moves itself. The host
 *  still owns the moments that need a person: which prompt, when writing opens,
 *  when results land and when names are revealed.
 *
 *  Driven off the clock on each poll rather than a background job, because
 *  there is no server to run one on. Every write is conditional on the phase it
 *  expects, so several screens polling at once cannot apply it twice. */
export const GET_READY_MS = 6000;
const AFTER_WRITING_MS = 3000;
const AFTER_REVEAL_MS = 2000;
// Voting closes itself once the room has gone quiet.
const VOTES_SETTLED_MS = 15000;
// Then the names land a beat later.
const RESULTS_HOLD_MS = 5000;

export async function advanceIfDue(gameId: string) {
  const { prisma } = await import("@/lib/prisma");
  const state = await prisma.gameState.findUnique({ where: { gameId } });
  // Someone is looking at a screen on purpose; leave it alone.
  if (state?.autoPaused) return;
  if (!state?.currentPromptId) return;
  const now = Date.now();

  // The prompt has been up long enough for the host to read it: open writing.
  if (state.phase === "PROMPT" && state.promptShownAt) {
    if (now - state.promptShownAt.getTime() > GET_READY_MS) {
      const game = await prisma.game.findUnique({ where: { id: gameId } });
      await prisma.gameState.updateMany({
        where: { gameId, phase: "PROMPT" },
        data: {
          phase: "WRITING",
          timerEndsAt: new Date(now + (game?.timerSeconds ?? 60) * 1000),
          timerRemaining: null,
          phaseAt: new Date(),
        },
      });
      return;
    }
    return;
  }

  // Everyone who is still in has answered: stop the clock. Checked on every
  // poll rather than only when a phone submits, so it also catches the operator
  // typing for someone and cannot be missed by a single unlucky request.
  if (state.phase === "WRITING" && state.timerEndsAt && state.timerEndsAt.getTime() > now) {
    const prompt = await prisma.gamePrompt.findUnique({
      where: { id: state.currentPromptId },
      select: { round: true },
    });
    const eligible =
      prompt?.round === "BELT"
        ? state.beltFinalists
        : (
            await prisma.gamePlayer.findMany({
              where: { gameId }, select: { id: true },
            })
          ).map((p) => p.id);

    if (eligible.length) {
      const answers = await prisma.gameAnswer.findMany({
        where: { promptId: state.currentPromptId, playerId: { in: eligible } },
        select: { text: true },
      });
      if (answers.filter((a) => a.text.trim()).length >= eligible.length) {
        await prisma.gameState.updateMany({
          where: { gameId, phase: "WRITING" },
          data: { timerEndsAt: new Date(), timerRemaining: null },
        });
        return;
      }
    }
  }

  // Writing is over and everyone is locked in: start showing answers.
  if (
    state.phase === "WRITING" &&
    state.timerEndsAt &&
    now - state.timerEndsAt.getTime() > AFTER_WRITING_MS
  ) {
    const answers = await prisma.gameAnswer.findMany({
      where: { promptId: state.currentPromptId },
    });
    const withText = answers.filter((a) => a.text.trim());
    const order = shuffled(withText);
    await prisma.$transaction([
      ...order.map((a, i) =>
        prisma.gameAnswer.update({ where: { id: a.id }, data: { displayOrder: i } })
      ),
      ...answers
        .filter((a) => !a.text.trim())
        .map((a) => prisma.gameAnswer.update({ where: { id: a.id }, data: { displayOrder: 999 } })),
      prisma.gameState.updateMany({
        where: { gameId, phase: "WRITING" },
        data: {
          phase: "REVEAL", revealedCount: 0, unmasked: false,
          revealStartedAt: new Date(), phaseAt: new Date(),
        },
      }),
    ]);
    return;
  }

  // The room has stopped voting: show the result.
  if (state.phase === "VOTING") {
    const last = await prisma.gameVote.findFirst({
      where: { promptId: state.currentPromptId },
      orderBy: { votedAt: "desc" },
      select: { votedAt: true },
    });
    if (last && now - last.votedAt.getTime() > VOTES_SETTLED_MS) {
      await prisma.gameState.updateMany({
        where: { gameId, phase: "VOTING" },
        data: { phase: "RESULTS", phaseAt: new Date() },
      });
    }
    return;
  }

  // The bars have filled: reveal who wrote what.
  if (state.phase === "RESULTS" && state.phaseAt) {
    if (now - state.phaseAt.getTime() > RESULTS_HOLD_MS) {
      await prisma.gameState.updateMany({
        where: { gameId, phase: "RESULTS" },
        data: { phase: "UNMASKED", unmasked: true, phaseAt: new Date() },
      });
    }
    return;
  }

  // Every answer is up and nobody votes before the end anyway: open the vote.
  if (state.phase === "REVEAL" && state.revealStartedAt) {
    const total = await prisma.gameAnswer.count({
      where: { promptId: state.currentPromptId, NOT: { text: "" } },
    });
    const shownFor = now - (state.revealStartedAt.getTime() + total * REVEAL_GAP_MS);
    if (total > 0 && shownFor > AFTER_REVEAL_MS) {
      await prisma.gameState.updateMany({
        where: { gameId, phase: "REVEAL" },
        data: { phase: "VOTING", phaseAt: new Date() },
      });
    }
  }
}
