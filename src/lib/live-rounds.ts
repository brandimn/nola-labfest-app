// The running order of the game, in one place.
//
// This exists because "R1", "R2" and "BELT" sort alphabetically as BELT, R1,
// R2, so any `orderBy: { round: "asc" }` puts the belt questions first. The
// setup page happened to hide that by filtering each round into its own
// section, but the host's list during the show is one flat list and showed the
// final round at the top. Sort with roundRank, never by the round string, and
// label rounds from here so the setup page and the host page always agree.
//
// Safe to import from a client component: no database, no server imports.

export const ROUNDS = ["R1", "R2", "BELT"] as const;
export type Round = (typeof ROUNDS)[number];

export const ROUND_TITLES: Record<string, string> = {
  R1: "Round 1: Free for all",
  R2: "Round 2: Caption this",
  BELT: "Belt Match",
};

export const ROUND_NOTES: Record<string, string> = {
  R1: "All six players answer",
  R2: "All six caption the photo",
  BELT: "The final two only, played last",
};

// Anything unrecognised sorts after the rounds we know, rather than jumping to
// the front the way an alphabetical sort would.
export function roundRank(round: string): number {
  const i = (ROUNDS as readonly string[]).indexOf(round);
  return i === -1 ? ROUNDS.length : i;
}

type Sortable = { round: string; sortOrder: number; isFinale?: boolean };

// Playing order: by round, then the finale last inside its round, then the
// order Brandi arranged them in on the setup page.
export function byPlayingOrder(a: Sortable, b: Sortable): number {
  return (
    roundRank(a.round) - roundRank(b.round) ||
    Number(a.isFinale ?? false) - Number(b.isFinale ?? false) ||
    a.sortOrder - b.sortOrder
  );
}
