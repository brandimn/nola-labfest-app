// One-time data fix that runs during the build, where DATABASE_URL exists.
// Safe to run on every deploy: it only ever fills something that is empty, so
// re-running changes nothing. Prints what it did so the build log is the receipt.
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const prisma = new PrismaClient();
const known = JSON.parse(readFileSync("./src/data/booth-details.json", "utf8"));

async function main() {
  const booths = await prisma.vendor.findMany({
    select: {
      id: true, name: true, category: true, categories: true,
      logoUrl: true, website: true,
    },
  });

  const restoredCats = [];
  const addedLogos = [];
  const addedSites = [];

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

    if (Object.keys(data).length) {
      await prisma.vendor.update({ where: { id: b.id }, data });
    }
  }

  console.log(`[booth-backfill] booths examined: ${booths.length}`);
  console.log(`[booth-backfill] categories restored (${restoredCats.length}): ${restoredCats.join(" | ") || "none needed"}`);
  console.log(`[booth-backfill] logos added (${addedLogos.length}): ${addedLogos.join(", ") || "none needed"}`);
  console.log(`[booth-backfill] websites added (${addedSites.length}): ${addedSites.join(", ") || "none needed"}`);

  // Report what is still blank so it is visible without digging in the app.
  const after = await prisma.vendor.findMany({
    select: { name: true, logoUrl: true, website: true, categories: true, category: true, description: true },
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
  console.log(`[booth-backfill] still incomplete (${stillMissing.length}):`);
  for (const line of stillMissing) console.log(`[booth-backfill]   ${line}`);
}

main()
  .catch((e) => {
    // Never fail the build over a data tidy-up.
    console.error("[booth-backfill] skipped:", e?.message ?? e);
  })
  .finally(() => prisma.$disconnect());
