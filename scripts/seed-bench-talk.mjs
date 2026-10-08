// Loads Brandi's prompts once. Guarded by a Setting, and it skips anything
// already there by text, so editing or deleting them in Setup sticks.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const PROMPTS = [
  { round: "R1", text: "Your lab's OnlyFans name" },
  { round: "R1", text: 'The real translation of "can you rush this one?"' },
  { round: "R1", text: "Your worst pickup line to use on a lab tech" },
  { round: "R1", text: "The one thing you should NOT yell at a dental convention" },
];

// Reword a prompt that is already loaded. The seeder skips anything whose text
// it already recognises, so changing the list above does nothing to a prompt
// sitting in the database. Matched on the exact old wording, so if Brandi has
// already fixed it herself on the setup page this quietly finds nothing.
// Both spellings are listed because the live copy carries a question mark the
// seeder's own list never had, which is exactly how the first attempt at this
// matched nothing.
const REWORDED = [
  {
    from: "Your worst pickup line to use at a dental convention?",
    to: "Your worst pickup line to use on a lab tech",
  },
  {
    from: "Your worst pickup line to use at a dental convention",
    to: "Your worst pickup line to use on a lab tech",
  },
];

async function rewordPrompts() {
  const KEY = "bench-talk-reword-v2";
  if (await prisma.setting.findUnique({ where: { key: KEY } })) {
    console.log("[bench-talk] rewordings: already done, skipped");
    return;
  }
  for (const r of REWORDED) {
    const hit = await prisma.gamePrompt.updateMany({
      where: { text: r.from },
      data: { text: r.to },
    });
    console.log(
      hit.count
        ? `[bench-talk] reworded ${hit.count}: "${r.from}" -> "${r.to}"`
        : `[bench-talk] nothing matched "${r.from}", left alone`
    );
  }
  await prisma.setting.create({ data: { key: KEY, value: new Date().toISOString() } });
}

// Print what is actually loaded, every deploy. The prompts can be edited in
// Setup, so the list in this file is not the truth and guessing at the live
// wording wastes a deploy each time.
async function listPrompts() {
  const prompts = await prisma.gamePrompt.findMany({
    select: { round: true, text: true, isFinale: true, imageUrl: true, used: true },
  });
  const rank = (r) => ["R1", "R2", "BELT"].indexOf(r);
  prompts.sort(
    (a, b) => rank(a.round) - rank(b.round) || Number(a.isFinale) - Number(b.isFinale)
  );
  console.log(`[bench-talk] prompts now loaded (${prompts.length}):`);
  for (const p of prompts) {
    const tags = [p.imageUrl ? "photo" : null, p.isFinale ? "FINALE" : null, p.used ? "used" : null]
      .filter(Boolean)
      .join(" ");
    console.log(`[bench-talk]   ${p.round.padEnd(4)} ${p.text}${tags ? `  [${tags}]` : ""}`);
  }
}

async function captionPrompts() {
  const KEY = "bench-talk-captions-v1";
  if (await prisma.setting.findUnique({ where: { key: KEY } })) {
    console.log("[bench-talk] caption prompts: already done, skipped");
    return;
  }
  const game =
    (await prisma.game.findFirst({ where: { mode: "LIVE" } })) ??
    (await prisma.game.findFirst({ where: { mode: "PRACTICE" } }));
  if (!game) return;

  const CAPTIONS = [
    { text: "Caption this", imageUrl: "/live/captions/elf-gypsum.webp" },
    { text: "Caption this", imageUrl: "/live/captions/crying-dentures.webp" },
    { text: "Caption this", imageUrl: "/live/captions/badge-bourbon.webp" },
  ];
  const added = [];
  for (const c of CAPTIONS) {
    const exists = await prisma.gamePrompt.findFirst({
      where: { gameId: game.id, imageUrl: c.imageUrl },
    });
    if (exists) continue;
    const count = await prisma.gamePrompt.count({ where: { gameId: game.id, round: "R2" } });
    await prisma.gamePrompt.create({
      data: { gameId: game.id, round: "R2", text: c.text, imageUrl: c.imageUrl, sortOrder: count },
    });
    added.push(c.imageUrl.split("/").pop());
  }
  console.log(`[bench-talk] caption prompts added (${added.length}): ${added.join(", ") || "none"}`);
  await prisma.setting.create({ data: { key: KEY, value: new Date().toISOString() } });
}

async function beltPrompts() {
  const KEY = "bench-talk-belt-v1";
  if (await prisma.setting.findUnique({ where: { key: KEY } })) {
    console.log("[bench-talk] belt prompts: already done, skipped");
    return;
  }
  const game =
    (await prisma.game.findFirst({ where: { mode: "LIVE" } })) ??
    (await prisma.game.findFirst({ where: { mode: "PRACTICE" } }));
  if (!game) return;

  // Finale last: the sort in the Next button puts isFinale at the end.
  const BELT = [
    { text: "Something Nowak should never sell", isFinale: false },
    { text: "Shawn's secret talent that nobody knows about", isFinale: false },
    { text: "What happens at LabFest stays at LabFest, except ___", isFinale: true },
  ];
  const added = [];
  for (const b of BELT) {
    const exists = await prisma.gamePrompt.findFirst({
      where: { gameId: game.id, text: b.text },
    });
    if (exists) continue;
    const count = await prisma.gamePrompt.count({ where: { gameId: game.id, round: "BELT" } });
    await prisma.gamePrompt.create({
      data: {
        gameId: game.id, round: "BELT", text: b.text,
        sortOrder: count, isFinale: b.isFinale,
      },
    });
    added.push(b.text.slice(0, 32));
  }
  console.log(`[bench-talk] belt prompts added (${added.length}): ${added.join(" | ") || "none"}`);
  await prisma.setting.create({ data: { key: KEY, value: new Date().toISOString() } });
}

async function renameGame() {
  // The title art Brandi made names the game, so the setting follows it. Still
  // editable in Setup right up to showtime.
  const KEY = "bench-talk-name-v1";
  if (await prisma.setting.findUnique({ where: { key: KEY } })) return;
  await prisma.game.updateMany({ data: { name: "LabFest Say Whaaaat???" } });
  await prisma.setting.create({ data: { key: KEY, value: new Date().toISOString() } });
  console.log("[bench-talk] game renamed to LabFest Say Whaaaat???");
}

async function main() {
  const KEY = "bench-talk-prompts-v2";
  if (await prisma.setting.findUnique({ where: { key: KEY } })) {
    console.log("[bench-talk] prompts: already done, skipped");
    return;
  }
  const game =
    (await prisma.game.findFirst({ where: { mode: "LIVE" } })) ??
    (await prisma.game.findFirst({ where: { mode: "PRACTICE" } })) ??
    (await prisma.game.create({ data: { mode: "PRACTICE" } }));
  await prisma.gameState.upsert({
    where: { gameId: game.id }, create: { gameId: game.id }, update: {},
  });

  const added = [];
  for (const p of PROMPTS) {
    const exists = await prisma.gamePrompt.findFirst({
      where: { gameId: game.id, text: p.text },
    });
    if (exists) continue;
    const count = await prisma.gamePrompt.count({ where: { gameId: game.id, round: p.round } });
    await prisma.gamePrompt.create({
      data: { gameId: game.id, round: p.round, text: p.text, sortOrder: count },
    });
    added.push(p.text);
  }
  console.log(`[bench-talk] prompts added (${added.length}): ${added.join(" | ") || "none"}`);
  await prisma.setting.create({ data: { key: KEY, value: new Date().toISOString() } });
}

main()
  .then(renameGame)
  .then(captionPrompts)
  .then(beltPrompts)
  .then(rewordPrompts)
  .then(listPrompts)
  .catch((e) => console.error("[bench-talk] skipped:", e?.message ?? e))
  .finally(() => prisma.$disconnect());
