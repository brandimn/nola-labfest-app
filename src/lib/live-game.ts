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
  return through.map((p) => p.id);
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
