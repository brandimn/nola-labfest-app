// Repairs data destroyed by a `prisma db push --accept-data-loss` run on
// 2026-08-18 15:38 UTC, which dropped columns and tables that existed in the
// database but not in the schema being pushed.
//
// Badge state and type come back from the Namebadges tab of the event workbook.
// Team members come back from the photo files that survived on disk; titles and
// contact details were only ever in the database, so Brandi fills those in.
//
// Only ever writes to an empty field, so nothing entered since is overwritten.
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const prisma = new PrismaClient();
const badges = JSON.parse(readFileSync("./src/data/namebadges.json", "utf8"));

const TEAM = [
  { name: "Shawn Nowak",    photoUrl: "/team/shawn.jpg",    sortOrder: 1 },
  { name: "Brandi Nowak",   photoUrl: "/speakers/brandi.png", sortOrder: 2 }, // reuses her speaker headshot
  { name: "Marybeth Starr", photoUrl: "/team/marybeth.jpg", sortOrder: 3 },
  { name: "Brett Hovis",    photoUrl: "/team/brett.jpg",    sortOrder: 4 },
];

async function main() {
  const KEY = "restore-after-data-loss-2026-08-18";
  const done = await prisma.setting.findUnique({ where: { key: KEY } });
  if (done) {
    console.log("[restore] already done, skipped");
    return;
  }

  // 1. Badge state and type, matched on name.
  const users = await prisma.user.findMany({
    select: { id: true, name: true, state: true, badgeType: true },
  });
  const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, "");
  const byName = new Map(badges.map((b) => [norm(b.name), b]));

  let fixedState = 0, fixedType = 0;
  const unmatched = [];
  for (const u of users) {
    const b = byName.get(norm(u.name));
    if (!b) { unmatched.push(u.name); continue; }
    const data = {};
    if (!u.state && b.state) { data.state = b.state; fixedState++; }
    if (!u.badgeType && b.badgeType) { data.badgeType = b.badgeType; fixedType++; }
    if (Object.keys(data).length) await prisma.user.update({ where: { id: u.id }, data });
  }
  console.log(`[restore] badge state put back on ${fixedState} people`);
  console.log(`[restore] badge type put back on ${fixedType} people`);
  console.log(`[restore] no workbook row for ${unmatched.length}: ${unmatched.slice(0, 25).join(", ")}`);

  // 2. Team members, only if the table is still empty.
  const existingTeam = await prisma.teamMember.count();
  if (existingTeam === 0) {
    for (const t of TEAM) await prisma.teamMember.create({ data: t });
    console.log(`[restore] team rebuilt with ${TEAM.length}: ${TEAM.map((t) => t.name).join(", ")}`);
    console.log("[restore] titles, emails and phones were only in the database and need re-entering");
  } else {
    console.log(`[restore] team already has ${existingTeam} rows, left alone`);
  }

  await prisma.setting.create({ data: { key: KEY, value: new Date().toISOString() } });
}

// The remaining three team members, named by Brandi. No headshots survived for
// them, so they go in without a photo and one can be uploaded from the admin
// team screen.
async function addRemainingTeam() {
  const KEY = "team-add-remaining-v1";
  if (await prisma.setting.findUnique({ where: { key: KEY } })) {
    console.log("[restore] remaining team: already done, skipped");
    return;
  }
  const MORE = [
    { name: "Kimmie Nowak", sortOrder: 5 },
    { name: "Jeff Dalton",  sortOrder: 6 },
    { name: "Haijin Yang",  sortOrder: 7 },
  ];
  const added = [];
  for (const m of MORE) {
    const exists = await prisma.teamMember.findFirst({ where: { name: m.name } });
    if (exists) continue;
    await prisma.teamMember.create({ data: m });
    added.push(m.name);
  }
  console.log(`[restore] team members added (${added.length}): ${added.join(", ") || "none, already there"}`);
  const total = await prisma.teamMember.count();
  console.log(`[restore] Nowak team is now ${total} people`);
  await prisma.setting.create({ data: { key: KEY, value: new Date().toISOString() } });
}

// Everyone imported from the roster postdates the workbook's Namebadges tab, so
// there is no row to match. Their badge type follows from what they are.
async function badgeTypeFromRole() {
  const KEY = "badge-type-from-role-v1";
  if (await prisma.setting.findUnique({ where: { key: KEY } })) {
    console.log("[restore] badge type from role: already done, skipped");
    return;
  }
  const byRole = { VENDOR: "VENDOR", SPEAKER: "SPEAKER", ADMIN: "NOWAK" };
  let n = 0;
  for (const [role, badgeType] of Object.entries(byRole)) {
    const r = await prisma.user.updateMany({
      where: { role, badgeType: null },
      data: { badgeType },
    });
    n += r.count;
    console.log(`[restore] ${role} -> badge ${badgeType}: ${r.count}`);
  }
  // Anyone with a speaker profile is a speaker on their badge, whatever their role.
  const speakers = await prisma.speaker.findMany({
    where: { userId: { not: null } },
    select: { userId: true },
  });
  const ids = speakers.map((s) => s.userId).filter(Boolean);
  if (ids.length) {
    const r = await prisma.user.updateMany({
      where: { id: { in: ids }, badgeType: null },
      data: { badgeType: "SPEAKER" },
    });
    n += r.count;
  }
  console.log(`[restore] badge type set from role on ${n} people`);
  await prisma.setting.create({ data: { key: KEY, value: new Date().toISOString() } });
}

main()
  .then(badgeTypeFromRole)
  .then(addRemainingTeam)
  .catch((e) => console.error("[restore] skipped:", e?.message ?? e))
  .finally(() => prisma.$disconnect());
