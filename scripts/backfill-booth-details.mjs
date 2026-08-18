// One-time data fix that runs during the build, where DATABASE_URL exists.
// Safe to run on every deploy: it only ever fills something that is empty, so
// re-running changes nothing. Prints what it did so the build log is the receipt.
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const prisma = new PrismaClient();
const known = JSON.parse(readFileSync("./src/data/booth-details.json", "utf8"));

// Booth names we have corrected. Applied only when the new name is not already
// taken, so a rename can never collide with a booth that already exists.
const RENAMES = { "WhipMix": "Whip Mix" };

async function main() {
  const booths = await prisma.vendor.findMany({
    select: {
      id: true, name: true, category: true, categories: true,
      logoUrl: true, website: true, description: true,
    },
  });

  // One time only, tracked in Setting so it can never fire again. Once real
  // booth numbers are assigned, a later deploy must not wipe them.
  const RESET_KEY = "booth-numbers-reset-to-tbd";
  const alreadyReset = await prisma.setting.findUnique({ where: { key: RESET_KEY } });
  let resetCount = 0;
  if (!alreadyReset) {
    const r = await prisma.vendor.updateMany({
      where: { NOT: { boothNumber: "TBD" } },
      data: { boothNumber: "TBD" },
    });
    resetCount = r.count;
    await prisma.setting.create({
      data: { key: RESET_KEY, value: new Date().toISOString() },
    });
  }
  console.log(
    `[booth-backfill] booth numbers reset to TBD: ${alreadyReset ? "already done, skipped" : resetCount}`
  );

  // Companies Brandi confirmed are not coming. Runs once, tracked in Setting,
  // so re-adding any of them later is not undone by a later deploy. Anything
  // with people or leads attached is left alone and reported instead.
  const DROP = [
    "Amann", "Amann Girrbach", "Rapid Shape", "Elos", "Elos Medtech",
    "Nola Smiles", "Novenda", "Novenda Technologies", "Shenpaz", "Medit", "VHF",
  ];
  const DROP_KEY = "booths-dropped-2026-08-18";
  const alreadyDropped = await prisma.setting.findUnique({ where: { key: DROP_KEY } });
  const dropped = [];
  const keptBack = [];
  if (!alreadyDropped) {
    for (const name of DROP) {
      const booth = await prisma.vendor.findFirst({
        where: { name: { equals: name, mode: "insensitive" } },
        include: { _count: { select: { staff: true, leads: true, boothScans: true } } },
      });
      if (!booth) continue;
      const { staff, leads, boothScans } = booth._count;
      if (staff || leads || boothScans) {
        keptBack.push(`${booth.name} (${staff} staff, ${leads} leads, ${boothScans} scans)`);
        continue;
      }
      await prisma.vendor.delete({ where: { id: booth.id } });
      dropped.push(booth.name);
    }
    await prisma.setting.create({ data: { key: DROP_KEY, value: new Date().toISOString() } });
  }
  console.log(
    `[booth-backfill] booths removed: ${alreadyDropped ? "already done, skipped" : (dropped.join(", ") || "none found")}`
  );
  if (keptBack.length) {
    console.log(`[booth-backfill] NOT removed, had people or data attached: ${keptBack.join(" | ")}`);
  }

  // Amann was held back by the safety check because a test scan was attached.
  // Brandi confirmed it goes. The scan cascades with the booth.
  const AMANN_KEY = "booth-dropped-amann";
  const amannDone = await prisma.setting.findUnique({ where: { key: AMANN_KEY } });
  if (!amannDone) {
    const booth = await prisma.vendor.findFirst({
      where: { name: { startsWith: "Amann", mode: "insensitive" } },
      include: { _count: { select: { staff: true, leads: true, boothScans: true } } },
    });
    if (booth) {
      const c = booth._count;
      await prisma.vendor.delete({ where: { id: booth.id } });
      console.log(
        `[booth-backfill] removed ${booth.name} on request (${c.staff} staff, ${c.leads} leads, ${c.boothScans} scans went with it)`
      );
    } else {
      console.log("[booth-backfill] Amann: already gone");
    }
    await prisma.setting.create({ data: { key: AMANN_KEY, value: new Date().toISOString() } });
  } else {
    console.log("[booth-backfill] Amann removal: already done, skipped");
  }

  const renamed = [];
  for (const [from, to] of Object.entries(RENAMES)) {
    const old = booths.find((b) => b.name === from);
    const clash = booths.find((b) => b.name === to);
    if (old && !clash) {
      await prisma.vendor.update({ where: { id: old.id }, data: { name: to } });
      old.name = to;
      renamed.push(`${from} -> ${to}`);
    }
  }

  const restoredCats = [];
  const addedLogos = [];
  const addedSites = [];
  const addedDescs = [];
  const addedCats = [];

  for (const b of booths) {
    const data = {};

    // Categories used to live in a single `category` field. The vendor pages and
    // the category filter read the `categories` list now, so copy it across.
    if (b.category && !b.categories?.length) {
      data.categories = [b.category];
      restoredCats.push(`${b.name} -> ${b.category}`);
    }

    const k = known[b.name];
    if (k?.logoUrl && !b.logoUrl) { data.logoUrl = k.logoUrl; addedLogos.push(b.name); }
    if (k?.website && !b.website) { data.website = k.website; addedSites.push(b.name); }
    // Starter copy only. A vendor editing their own booth overwrites it, and we
    // never touch a description someone has already written.
    if (k?.description && !b.description) { data.description = k.description; addedDescs.push(b.name); }
    // Only when the booth has no category at all, in either field. Keeps the
    // older single field in step so both the filter and the pages agree.
    if (k?.categories?.length && !b.categories?.length && !b.category) {
      data.categories = k.categories;
      data.category = k.categories[0];
      addedCats.push(`${b.name} (${k.categories.join(", ")})`);
    }

    if (Object.keys(data).length) {
      await prisma.vendor.update({ where: { id: b.id }, data });
    }
  }

  console.log(`[booth-backfill] booths examined: ${booths.length}`);
  console.log(`[booth-backfill] categories restored (${restoredCats.length}): ${restoredCats.join(" | ") || "none needed"}`);
  console.log(`[booth-backfill] logos added (${addedLogos.length}): ${addedLogos.join(", ") || "none needed"}`);
  console.log(`[booth-backfill] websites added (${addedSites.length}): ${addedSites.join(", ") || "none needed"}`);
  console.log(`[booth-backfill] descriptions added (${addedDescs.length}): ${addedDescs.join(", ") || "none needed"}`);
  console.log(`[booth-backfill] categories set (${addedCats.length}): ${addedCats.join(" | ") || "none needed"}`);
  console.log(`[booth-backfill] renamed (${renamed.length}): ${renamed.join(" | ") || "none needed"}`);

  // Report what is still blank so it is visible without digging in the app.
  const after = await prisma.vendor.findMany({
    select: { id: true, name: true, logoUrl: true, website: true, categories: true, category: true, description: true },
    orderBy: { name: "asc" },
  });
  const stillMissing = after
    .map((v) => {
      const m = [];
      if (!v.logoUrl) m.push("logo");
      if (!v.website) m.push("website");
      if (!v.categories?.length && !v.category) m.push("category");
      if (!v.description) m.push("description");
      return m.length ? `${v.name}: no ${m.join(", no ")}` : null;
    })
    .filter(Boolean);
  // Report any booths that still look like the same company under two names,
  // so leftovers are visible in the log without opening the app.
  const squash = (n) => n.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]/g, "");
  const dupes = [];
  for (let i = 0; i < after.length; i++) {
    for (let j = i + 1; j < after.length; j++) {
      const a = squash(after[i].name), b = squash(after[j].name);
      if (!a || !b) continue;
      const short = a.length < b.length ? a : b;
      const long = a.length < b.length ? b : a;
      if (a === b || (short.length >= 4 && long.startsWith(short))) {
        dupes.push(`${after[i].name} <-> ${after[j].name}`);
      }
    }
  }
  console.log(`[booth-backfill] total booths now: ${after.length}`);
  console.log(`[booth-backfill] possible duplicates remaining (${dupes.length}): ${dupes.join(" | ") || "none"}`);

  // Full inventory: a booth record is a company, not a person. Several of these
  // are not a physical table, so list people per booth and let the workbook
  // notes decide what actually needs floor space.
  const withStaff = await prisma.vendor.findMany({
    select: { name: true, boothNumber: true, _count: { select: { staff: true } } },
    orderBy: { name: "asc" },
  });
  console.log(`[booth-inventory] ${withStaff.length} booth records:`);
  for (const v of withStaff) {
    console.log(`[booth-inventory]   ${v.name} — ${v._count.staff} people — booth ${v.boothNumber}`);
  }
  const totalPeople = withStaff.reduce((n, v) => n + v._count.staff, 0);
  console.log(`[booth-inventory] people attached to booths: ${totalPeople}`);

  console.log(`[booth-backfill] still incomplete (${stillMissing.length}):`);
  for (const line of stillMissing) console.log(`[booth-backfill]   ${line}`);
}

main()
  .catch((e) => {
    // Never fail the build over a data tidy-up.
    console.error("[booth-backfill] skipped:", e?.message ?? e);
  })
  .finally(() => prisma.$disconnect());
