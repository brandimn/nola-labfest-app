// Marks a badge as needing reprinting.
//
// The badge printing page picks people by when their account was created, so
// "Added today" prints only the new arrivals rather than all 200 again. Someone
// whose name was spelled wrong needs the same treatment: their badge has to come
// out of the next print run even though their account is old.
//
// So their created date is moved to now. Nothing else about them changes, they
// keep their login, their badge QR code and their scans. They simply look new to
// the printing page.
//
// Runs after sync-master-list, which is what corrects the spelling itself, and
// each batch is guarded by its own key so a redeploy does not keep dragging old
// badges back into the print run.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Add a new entry for each reprint, with a fresh key. Leave the old ones: they
// are the record of what was reprinted and when, and they never run twice.
const BATCHES = [
  {
    key: "reprint-2026-10-09-chelsey-jackson",
    why: "name was spelled Chelsie, should be Chelsey",
    emails: ["chelsie@midsouthdentallab.com"],
  },
];

async function main() {
  for (const batch of BATCHES) {
    if (await prisma.setting.findUnique({ where: { key: batch.key } })) {
      console.log(`[reprint] ${batch.key}: already done, skipped`);
      continue;
    }

    const people = await prisma.user.findMany({
      where: { email: { in: batch.emails } },
      select: { id: true, name: true, email: true },
    });

    const missing = batch.emails.filter(
      (e) => !people.some((p) => p.email.toLowerCase() === e.toLowerCase())
    );
    if (missing.length) {
      console.log(`[reprint] ${batch.key}: no account for ${missing.join(", ")}`);
    }

    const now = new Date();
    for (const p of people) {
      await prisma.user.update({ where: { id: p.id }, data: { createdAt: now } });
      console.log(`[reprint] ${p.name} <${p.email}> will print again (${batch.why})`);
    }

    // Recorded even when nobody matched, so a typo in the list does not retry
    // on every single deploy from now on.
    await prisma.setting.create({ data: { key: batch.key, value: now.toISOString() } });
  }

  // Say what the printing page will treat as new today, so it is obvious from
  // the build log whether the reprint landed.
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const todays = await prisma.user.findMany({
    where: { createdAt: { gte: since }, badgeType: { not: null } },
    select: { name: true, company: true, badgeType: true },
    orderBy: { name: "asc" },
  });
  console.log(`[reprint] "Added today" will print ${todays.length} badge(s):`);
  for (const p of todays) {
    console.log(`[reprint]   [${p.badgeType}] ${p.name} | ${p.company ?? "no company"}`);
  }
}

main()
  .catch((e) => console.error("[reprint] failed:", e?.message ?? e))
  .finally(() => prisma.$disconnect());
