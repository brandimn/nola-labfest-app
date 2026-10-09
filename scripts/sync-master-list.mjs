// Brings the app in line with the SharePoint master list: creates anyone
// missing so they get a badge, corrects names, companies, states and badge
// types, and attaches vendor people to their booth so they can scan.
//
// Nothing is deleted here. Accounts in the app that are not on the list are
// reported for Brandi to confirm, because some of them are attendees who
// registered themselves and belong there.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";

const prisma = new PrismaClient();
const master = JSON.parse(readFileSync("./src/data/master-list.json", "utf8"));
const SHARED = "Labfest26";

const squash = (s) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Listed on the vendors page as a sponsor, but did not buy a booth, so their
// people get a badge and no lead scanning. This has to live here rather than
// be a one off fix: the attach step below runs on every deploy and would
// quietly give them scanning back each time.
const NO_SCANNING = new Set(["gc"]);

// Address corrections, applied before anything else.
//
// The sync finds people by email, so changing an address on the master list
// without moving the existing account first would create a second account for
// the same person rather than correct the one that is there. Matched on the old
// address, so it runs once and then finds nothing.
const EMAIL_FIXES = [
  // Her name was printed Chelsie and should be Chelsey, address included.
  { from: "chelsie@midsouthdentallab.com", to: "chelsey@midsouthdentallab.com" },
];

async function fixEmails() {
  for (const fix of EMAIL_FIXES) {
    const moving = await prisma.user.findUnique({ where: { email: fix.from } });
    if (!moving) continue;
    const taken = await prisma.user.findUnique({ where: { email: fix.to } });
    if (taken) {
      console.log(`[master] cannot move ${fix.from}: ${fix.to} already belongs to ${taken.name}`);
      continue;
    }
    await prisma.user.update({ where: { id: moving.id }, data: { email: fix.to } });
    console.log(`[master] ${moving.name}: ${fix.from} -> ${fix.to}`);
  }
}

async function main() {
  await fixEmails();

  const hash = await bcrypt.hash(SHARED, 10);
  const booths = await prisma.vendor.findMany({ select: { id: true, name: true } });

  // Make sure a sponsor who never bought a booth has nobody attached to it,
  // every run, however they got there.
  for (const b of booths.filter((v) => NO_SCANNING.has(squash(v.name)))) {
    const staff = await prisma.user.updateMany({ where: { vendorId: b.id }, data: { vendorId: null } });
    const owner = await prisma.vendor.updateMany({
      where: { id: b.id, userId: { not: null } }, data: { userId: null },
    });
    if (staff.count || owner.count) {
      console.log(`[master] ${b.name} is a sponsor without a booth: detached ${staff.count} staff, ${owner.count} owner`);
    }
  }

  // Booths anyone may be attached to. A sponsor without a booth is not one.
  const attachable = booths.filter((b) => !NO_SCANNING.has(squash(b.name)));

  const boothFor = (company) => {
    const c = squash(company);
    if (!c || NO_SCANNING.has(c)) return null;
    return (
      attachable.find((b) => squash(b.name) === c) ??
      attachable.find((b) => {
        const n = squash(b.name);
        return n.length >= 4 && (c.startsWith(n) || n.startsWith(c));
      }) ??
      null
    );
  };

  const created = [];
  const updated = [];
  const linked = [];
  const noBooth = [];

  for (const m of master) {
    const existing = await prisma.user.findUnique({ where: { email: m.email } });
    const role = m.isNowak ? "ADMIN" : m.isVendor ? "VENDOR" : m.isSpeaker ? "SPEAKER" : "ATTENDEE";
    const booth = m.isVendor ? boothFor(m.company) : null;

    if (!existing) {
      const u = await prisma.user.create({
        data: {
          email: m.email,
          name: m.name,
          company: m.company || null,
          state: m.state || null,
          badgeType: m.badgeType,
          // Admins are made deliberately, not by a sync.
          role: role === "ADMIN" ? "ATTENDEE" : role,
          password: hash,
          mustChangePassword: true,
          vendorId: booth?.id ?? null,
        },
      });
      created.push(`${u.name} <${u.email}>`);
      if (booth) linked.push(`${m.name} -> ${booth.name}`);
      else if (m.isVendor) noBooth.push(`${m.name} (${m.company})`);
      continue;
    }

    // Never downgrade an admin, and never take a booth away.
    const data = {
      name: m.name,
      company: m.company || existing.company,
      state: m.state || existing.state,
      badgeType: existing.badgeType ?? m.badgeType,
    };
    if (existing.role !== "ADMIN" && role !== "ADMIN") data.role = role;
    if (m.isVendor && !existing.vendorId && booth) {
      data.vendorId = booth.id;
      linked.push(`${m.name} -> ${booth.name}`);
    } else if (m.isVendor && !existing.vendorId && !booth) {
      noBooth.push(`${m.name} (${m.company})`);
    }
    await prisma.user.update({ where: { id: existing.id }, data });
    updated.push(m.name);
  }

  // The badge PDF prints everyone who has a badge type and silently skips
  // anyone whose is empty, so that is the one way a person can be missing from
  // the printout without anybody noticing. Say so out loud, every deploy.
  const noBadgeType = await prisma.user.findMany({
    where: { badgeType: null },
    select: { name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
  if (noBadgeType.length) {
    console.log(`[master] WILL NOT PRINT, no badge type (${noBadgeType.length}):`);
    for (const u of noBadgeType) console.log(`[master]   ${u.name} <${u.email}> ${u.role}`);
  } else {
    console.log(`[master] badge check: everyone has a badge type, nobody will be skipped`);
  }

  console.log(`[master] on the list: ${master.length}`);
  console.log(`[master] created (${created.length}): ${created.slice(0, 60).join(" | ")}`);
  console.log(`[master] updated: ${updated.length}`);
  console.log(`[master] attached to a booth (${linked.length}): ${linked.join(" | ") || "none"}`);
  console.log(`[master] vendor with no matching booth (${noBooth.length}): ${noBooth.join(" | ") || "none"}`);

  // Who is in the app but not on the list.
  const emails = new Set(master.map((m) => m.email));
  const extras = await prisma.user.findMany({
    where: { email: { notIn: [...emails] } },
    select: { email: true, name: true, role: true, company: true },
    orderBy: { role: "asc" },
  });
  console.log(`[master] in the app but NOT on the master list: ${extras.length}`);
  for (const e of extras) {
    console.log(`[master]   EXTRA ${e.role}: ${e.name} <${e.email}> ${e.company ?? ""}`);
  }

  const stillEmpty = await prisma.vendor.findMany({
    where: { userId: null, staff: { none: {} } },
    select: { name: true },
    orderBy: { name: "asc" },
  });
  console.log(`[master] booths still with nobody (${stillEmpty.length}): ${stillEmpty.map((b) => b.name).join(", ") || "none"}`);
}

main().catch((e) => console.error("[master] failed:", e?.message ?? e)).finally(() => prisma.$disconnect());
