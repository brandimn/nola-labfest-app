// One off roster tidy before badges are printed, on Brandi's instructions
// (2026-10-06). Nobody is matched by email address, because several of the
// duplicates exist precisely BECAUSE an address was typed wrong. Everything is
// matched by name and checked against the master list instead.
//
//   1. snapshot the whole roster into Setting first, and refuse to touch
//      anything if that fails
//   2. remove the people confirmed not coming
//   3. where one person holds several accounts, keep the best and fold the
//      rest into it
//   4. report what is left: badge-only accounts, booths with nobody on them,
//      vendor staff with no booth
//
// Anyone with genuinely no email keeps their @labfest.badge account so they
// still get a badge. Guarded so it only ever runs once.
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();
// Bumped to let the run repeat after a late addition to ALIASES. Repeating is
// safe: the snapshot is never overwritten, the removals find nobody left, and
// a merge only fires where a duplicate still exists.
const RUN_KEY = "roster-cleanup-2026-10-06-v2";
const SNAPSHOT_KEY = "roster-snapshot-2026-10-06";

const norm = (s) => (s ?? "").toLowerCase().replace(/[^a-z]/g, "");
const squash = (s) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Confirmed not coming. Matched on name, and only ever against someone who is
// NOT on the master list, so this cannot reach a real attendee who happens to
// share a name. That guard is what keeps Jill Spina of Nowak while removing
// Jill Swafford, and what protects Denisse Lasso, Harvey Cai and Amy Byrd,
// who turned out to be on the list after all under a second address.
const NOT_COMING = [
  "Izzy Mraz",
  "Ronan Barrett",
  "Eric Hall",
  "Erica DiManna",
  "Maria Connelly",
  "Travis Bedwell",
  "Travs Bedwell", // the Namebadges tab spells it this way
  "Preston Primm",
  "Kim Solomon",
  "Jorge",
  "Jill Swafford",
  "Anne Koelzer",
  "Kris Koelzer",
  "Joseph Oliveira", // Elos Medtech cancelled
];

// Records the same person holds under a name that will never match on its own:
// the Nowak team filed under first names only, and three vendor staff whose
// badge row is spelled differently from their master list entry. Without this
// each of them prints twice. Several candidate addresses are allowed because
// the duplicate pass may already have settled on one of them.
const ALIASES = [
  { badgeName: "Brandi", emails: ["brandi@nowakdental.com"] },
  { badgeName: "Brett", emails: ["brett.hovis@nowakdental.com"] },
  { badgeName: "Haijin", emails: ["haijin@nowakdental.com"] },
  { badgeName: "Jeff", emails: ["jeff@nowakdental.com", "jdalton@nowakdental.com"] },
  { badgeName: "Kimmie", emails: ["knowak@nowakdental.com"] },
  { badgeName: "MB", emails: ["marybeth@nowakdental.com"] },
  { badgeName: "Shawn", emails: ["shawn@nowakdental.com"] },
  { badgeName: "Mark Reis", emails: ["mries@ransom-randolph.com"] },
  { badgeName: "Tom Heusing", emails: ["thomasheusing@aidite.com"] },
  { badgeName: "Ryan Solorzano, CDT", emails: ["ryan.solorzano@pac-dent.com"] },
  { badgeName: "Amy Bird", emails: ["amy.byrd@dentsplysirona.com"] },
  // Same mailbox name at shining3d.com and .us, and the master list calls her
  // Grace, so the same-name pass never saw these two as one person.
  { badgeName: "Gratiela Gomez", emails: ["gratiela@shining3d.us"] },
];

// If the script ever matches more than this for removal my name matching is
// wrong, and I would rather it stop than quietly empty the roster the morning
// badges get printed.
const MAX_REMOVALS = 40;

const SELECT = {
  id: true, email: true, name: true, role: true, company: true, state: true,
  badgeType: true, phone: true, title: true, vendorId: true,
  ownedVendor: { select: { id: true } },
  ownedSpeaker: { select: { id: true } },
  _count: { select: { boothScans: true, leadsAsAttendee: true, favorites: true } },
};

async function moveRelations(fromId, toId) {
  // Each of these pairs is unique, so anything that would collide has to go
  // before the rest can move across.
  const scans = await prisma.boothScan.findMany({
    where: { attendeeId: toId }, select: { vendorId: true },
  });
  await prisma.boothScan.deleteMany({
    where: { attendeeId: fromId, vendorId: { in: scans.map((s) => s.vendorId) } },
  });
  await prisma.boothScan.updateMany({ where: { attendeeId: fromId }, data: { attendeeId: toId } });

  const leads = await prisma.lead.findMany({
    where: { attendeeId: toId }, select: { vendorId: true },
  });
  await prisma.lead.deleteMany({
    where: { attendeeId: fromId, vendorId: { in: leads.map((l) => l.vendorId) } },
  });
  await prisma.lead.updateMany({ where: { attendeeId: fromId }, data: { attendeeId: toId } });

  const favs = await prisma.favorite.findMany({
    where: { userId: toId }, select: { sessionId: true },
  });
  await prisma.favorite.deleteMany({
    where: { userId: fromId, sessionId: { in: favs.map((f) => f.sessionId) } },
  });
  await prisma.favorite.updateMany({ where: { userId: fromId }, data: { userId: toId } });

  await prisma.galleryPhoto.updateMany({ where: { uploaderId: fromId }, data: { uploaderId: toId } });
  // An announcement that was already sent has to keep an author, so hand it to
  // the survivor rather than lose it.
  await prisma.announcement.updateMany({ where: { sentById: fromId }, data: { sentById: toId } });
  // One booth vote per person, and it is a bit of fun rather than data worth
  // reconciling. The survivor keeps theirs.
  await prisma.boothVote.deleteMany({ where: { attendeeId: fromId } });
  await prisma.pushSubscription.deleteMany({ where: { userId: fromId } });
}

// Let go of anything that would block the delete, then delete. Returns false
// if the account was left in place.
async function removeUser(u) {
  // Announcements require an author, and there is nobody to hand them to when
  // the account is simply going away. Leave the account rather than destroy
  // the sent history, and say so.
  const sent = await prisma.announcement.count({ where: { sentById: u.id } });
  if (sent > 0) {
    console.log(`[cleanup] KEPT ${u.name} <${u.email}>: sent ${sent} announcement(s), remove by hand if you mean to`);
    return false;
  }
  await prisma.vendor.updateMany({ where: { userId: u.id }, data: { userId: null } });
  await prisma.speaker.updateMany({ where: { userId: u.id }, data: { userId: null } });
  await prisma.user.delete({ where: { id: u.id } });
  return true;
}

// Fill any gap on the surviving record from the one going away, then delete it.
async function merge(from, to) {
  await prisma.user.update({
    where: { id: to.id },
    data: {
      company: to.company ?? from.company,
      state: to.state ?? from.state,
      badgeType: to.badgeType ?? from.badgeType,
      phone: to.phone ?? from.phone,
      title: to.title ?? from.title,
      vendorId: to.vendorId ?? from.vendorId,
    },
  });
  await moveRelations(from.id, to.id);
  await removeUser(from);
}

async function snapshot() {
  const users = await prisma.user.findMany({
    select: {
      id: true, email: true, name: true, role: true, company: true, title: true,
      state: true, badgeType: true, phone: true, vendorId: true, badgeToken: true,
      mustChangePassword: true,
    },
    orderBy: { name: "asc" },
  });
  const vendors = await prisma.vendor.findMany({
    select: { id: true, name: true, userId: true },
    orderBy: { name: "asc" },
  });
  const payload = JSON.stringify({ takenAt: new Date().toISOString(), users, vendors });
  // Never overwrite an existing snapshot. If this script has to be run twice,
  // the second run would otherwise replace the untouched roster with the
  // already-reduced one, which is exactly the copy worth keeping.
  const existing = await prisma.setting.findUnique({ where: { key: SNAPSHOT_KEY } });
  if (existing) {
    console.log(`[cleanup] snapshot already taken earlier, keeping that one (${existing.value.length} bytes)`);
    return;
  }
  await prisma.setting.create({ data: { key: SNAPSHOT_KEY, value: payload } });
  // Read it straight back. A snapshot that did not land is worse than none,
  // because it would let the deletes below go ahead on a false promise.
  const check = await prisma.setting.findUnique({ where: { key: SNAPSHOT_KEY } });
  if (!check || check.value.length !== payload.length) {
    throw new Error("snapshot did not save, refusing to change anything");
  }
  console.log(`[cleanup] snapshot saved: ${users.length} accounts, ${vendors.length} booths, key ${SNAPSHOT_KEY}`);
  // Also print it, so the roster survives in the build log independently of
  // the database it describes.
  console.log("[cleanup] --- snapshot begins ---");
  for (const u of users) {
    console.log(`[snap] ${u.name} | ${u.email} | ${u.role} | ${u.badgeType ?? "-"} | ${u.company ?? "-"} | ${u.state ?? "-"}`);
  }
  console.log("[cleanup] --- snapshot ends ---");
}

async function main() {
  if (await prisma.setting.findUnique({ where: { key: RUN_KEY } })) {
    console.log("[cleanup] already run, skipping");
    return;
  }

  const master = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "src/data/master-list.json"), "utf8")
  );
  const onList = new Set(master.map((m) => String(m.email).toLowerCase()));

  const before = await prisma.user.count();
  console.log(`[cleanup] starting with ${before} accounts`);

  // 1. Snapshot. Anything throwing here stops the whole run.
  await snapshot();

  // 2. People confirmed not coming, never anyone on the master list.
  const wanted = new Set(NOT_COMING.map(norm));
  const doomed = (await prisma.user.findMany({ select: SELECT })).filter(
    (u) => wanted.has(norm(u.name)) && !onList.has(u.email.toLowerCase())
  );
  if (doomed.length > MAX_REMOVALS) {
    console.log(`[cleanup] ABORT: ${doomed.length} removal matches is more than expected, nothing changed`);
    return;
  }
  for (const u of doomed) {
    if (await removeUser(u)) {
      console.log(`[cleanup] REMOVED, not coming: ${u.name} <${u.email}>`);
    }
  }
  const missed = NOT_COMING.filter((n) => !doomed.some((d) => norm(d.name) === norm(n)));
  if (missed.length) {
    console.log(`[cleanup] no account to remove for: ${missed.join(", ")}`);
  }

  // 3a. Duplicates under the same name. Admin wins, then being on the master
  //     list, then a real address over a placeholder, then owning a booth.
  const score = (u) => {
    const acts = u._count.boothScans + u._count.leadsAsAttendee + u._count.favorites;
    return (
      (u.role === "ADMIN" ? 10000 : 0) +
      (onList.has(u.email.toLowerCase()) ? 1000 : 0) +
      (u.email.endsWith("@labfest.badge") ? 0 : 500) +
      (u.ownedVendor || u.ownedSpeaker ? 100 : 0) +
      (u.vendorId ? 50 : 0) +
      Math.min(acts, 40)
    );
  };

  const groups = new Map();
  for (const u of await prisma.user.findMany({ select: SELECT })) {
    const k = norm(u.name);
    if (!k) continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(u);
  }
  let mergedByName = 0;
  for (const [, people] of groups) {
    if (people.length < 2) continue;
    const [keep, ...rest] = [...people].sort((a, b) => score(b) - score(a));
    for (const drop of rest) {
      await merge(drop, keep);
      mergedByName += 1;
      console.log(`[cleanup] MERGED ${drop.name} <${drop.email}> into <${keep.email}>`);
    }
  }
  console.log(`[cleanup] ${mergedByName} same-name duplicates folded in`);

  // 3b. The aliases, now the duplicate pass has settled on one account each.
  let mergedByAlias = 0;
  for (const alias of ALIASES) {
    const from = await prisma.user.findFirst({
      where: { name: { equals: alias.badgeName, mode: "insensitive" } },
      select: SELECT,
    });
    if (!from) continue;
    let to = null;
    for (const email of alias.emails) {
      to = await prisma.user.findUnique({ where: { email }, select: SELECT });
      if (to) break;
    }
    if (!to) {
      console.log(`[cleanup] alias ${alias.badgeName}: no account at ${alias.emails.join(" or ")}, left alone`);
      continue;
    }
    if (to.id === from.id) continue;
    await merge(from, to);
    mergedByAlias += 1;
    console.log(`[cleanup] MERGED badge record "${from.name}" <${from.email}> into ${to.name} <${to.email}>`);
  }
  console.log(`[cleanup] ${mergedByAlias} differently-spelled duplicates folded in`);

  // 4. What is left to deal with by hand.
  const left = await prisma.user.findMany({
    where: { email: { endsWith: "@labfest.badge" } },
    select: { name: true, company: true, badgeType: true, state: true },
    orderBy: [{ badgeType: "asc" }, { name: "asc" }],
  });
  console.log(`[cleanup] ${left.length} accounts still on a @labfest.badge address (no email of their own):`);
  for (const p of left) {
    console.log(`    [${p.badgeType ?? "-"}] ${p.name} | ${p.company ?? "no company"} | ${p.state ?? "-"}`);
  }

  // Report only. Attaching people to booths belongs to sync-master-list.mjs,
  // which knows which sponsors never bought one. An earlier version of this
  // matched loosely enough on company name to hand GC scanning it had not
  // paid for, so it does not get to write here any more.
  const loose = await prisma.user.findMany({
    where: { badgeType: "VENDOR", vendorId: null, ownedVendor: null },
    select: { name: true, email: true, company: true },
    orderBy: { name: "asc" },
  });
  console.log(`[cleanup] ${loose.length} vendor-badged people with no booth:`);
  for (const u of loose) {
    console.log(`    ${u.name} <${u.email}> | ${u.company ?? "no company"}`);
  }

  const empty = await prisma.vendor.findMany({
    where: { userId: null, staff: { none: {} } },
    select: { name: true },
    orderBy: { name: "asc" },
  });
  console.log(`[cleanup] ${empty.length} booths with nobody on them: ${empty.map((b) => b.name).join(", ") || "none"}`);

  const after = await prisma.user.count();
  console.log(`[cleanup] DONE: ${before} accounts -> ${after}`);
  await prisma.setting.create({ data: { key: RUN_KEY, value: new Date().toISOString() } });
}

main()
  .catch((e) => {
    // Prisma validation errors carry an empty message, which hid the cause
    // once already. Print everything that might name it.
    console.error("[cleanup] FAILED, nothing further changed");
    console.error(`[cleanup] code: ${e?.code ?? "none"}`);
    console.error(`[cleanup] message: ${e?.message || "(empty)"}`);
    console.error(`[cleanup] detail: ${String(e).slice(0, 4000)}`);
  })
  .finally(() => prisma.$disconnect());
