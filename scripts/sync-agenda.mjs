// Loads the published 2026 agenda from nolalabfest.com into the app.
// Matches on title plus start time so re-running is a no-op, links each talk to
// its speaker profile, and marks the lunch sponsors on their booths.
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const prisma = new PrismaClient();
const agenda = JSON.parse(readFileSync("./src/data/agenda-2026.json", "utf8"));

async function main() {
  const speakers = await prisma.speaker.findMany({ select: { id: true, name: true } });
  const speakerId = (name) =>
    speakers.find((s) => s.name.toLowerCase() === (name ?? "").toLowerCase())?.id ?? null;

  const created = [];
  const updated = [];
  const keptIds = [];

  for (const s of agenda.sessions) {
    const startsAt = new Date(s.startsAt);
    const endsAt = new Date(s.endsAt);
    const data = {
      title: s.title,
      description: s.description ?? null,
      speaker: s.speaker ?? null,
      speakerId: s.speaker ? speakerId(s.speaker) : null,
      track: s.track ?? null,
      isFeatured: !!s.isFeatured,
      startsAt,
      endsAt,
    };

    const existing = await prisma.session.findFirst({
      where: { title: s.title, startsAt },
    });
    if (existing) {
      await prisma.session.update({ where: { id: existing.id }, data });
      keptIds.push(existing.id);
      updated.push(s.title);
    } else {
      const row = await prisma.session.create({ data });
      keptIds.push(row.id);
      created.push(s.title);
    }
  }

  console.log(`[agenda] created (${created.length}): ${created.join(" | ") || "none"}`);
  console.log(`[agenda] updated (${updated.length}): ${updated.join(" | ") || "none"}`);
  console.log(`[agenda] unlinked speakers: ${
    agenda.sessions.filter((s) => s.speaker && !speakerId(s.speaker)).map((s) => s.speaker).join(", ") || "none"
  }`);

  // Anything left over is not on the published agenda. Remove it only when
  // nobody has favourited it, otherwise report it and leave it alone.
  const leftovers = await prisma.session.findMany({
    where: { id: { notIn: keptIds } },
    include: { _count: { select: { favorites: true } } },
    orderBy: { startsAt: "asc" },
  });
  const removed = [];
  const kept = [];
  for (const l of leftovers) {
    if (l._count.favorites > 0) {
      kept.push(`${l.title} (${l._count.favorites} favourited)`);
      continue;
    }
    await prisma.session.delete({ where: { id: l.id } });
    removed.push(l.title);
  }
  console.log(`[agenda] removed, not on the published agenda (${removed.length}): ${removed.join(" | ") || "none"}`);
  if (kept.length) console.log(`[agenda] LEFT ALONE, someone favourited them: ${kept.join(" | ")}`);

  // Lunch sponsors, from the agenda page.
  const marked = [];
  for (const name of agenda.lunchSponsors) {
    const v = await prisma.vendor.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
    if (!v) { marked.push(`${name} (no booth found)`); continue; }
    if (!v.isLunchSponsor) {
      await prisma.vendor.update({ where: { id: v.id }, data: { isLunchSponsor: true } });
      marked.push(`${v.name} marked`);
    } else {
      marked.push(`${v.name} already marked`);
    }
  }
  console.log(`[agenda] lunch sponsors: ${marked.join(" | ")}`);

  // Sponsorship tags taken from the agenda page. Applied once so that editing
  // or clearing them in the admin screen afterwards is not undone by a deploy.
  const TAGS = { "Scheftner": ["Distillery Sponsor"] };
  const TAGS_KEY = "vendor-sponsorship-tags-v1";
  const tagsDone = await prisma.setting.findUnique({ where: { key: TAGS_KEY } });
  if (!tagsDone) {
    const out = [];
    for (const [name, labels] of Object.entries(TAGS)) {
      const v = await prisma.vendor.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
      if (!v) { out.push(`${name}: no booth`); continue; }
      await prisma.vendor.update({ where: { id: v.id }, data: { sponsorships: labels } });
      out.push(`${v.name}: ${labels.join(", ")}`);
    }
    await prisma.setting.create({ data: { key: TAGS_KEY, value: new Date().toISOString() } });
    console.log(`[agenda] sponsorship tags: ${out.join(" | ")}`);
  } else {
    console.log("[agenda] sponsorship tags: already done, skipped");
  }

  const total = await prisma.session.count();
  console.log(`[agenda] sessions in the app now: ${total}`);
}

main()
  .catch((e) => console.error("[agenda] skipped:", e?.message ?? e))
  .finally(() => prisma.$disconnect());
