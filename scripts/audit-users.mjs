// Read only. Reports who can actually sign in and who can actually scan, so we
// are working from the database rather than from anyone's assumption.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const PLACEHOLDER = /(example\.com|test\.com|placeholder|noemail|@none|\.local$|^no-?reply)/i;

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true, email: true, name: true, role: true, company: true,
      vendorId: true, mustChangePassword: true, badgeType: true,
      ownedVendor: { select: { id: true, name: true } },
      ownedSpeaker: { select: { id: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const byRole = {};
  for (const u of users) byRole[u.role] = (byRole[u.role] ?? 0) + 1;
  console.log(`[audit] total users: ${users.length}`);
  console.log(`[audit] by role: ${Object.entries(byRole).map(([r, n]) => `${r}=${n}`).join(" ")}`);

  // Can this person capture a lead? Needs a booth, either as staff or as owner.
  const vendorish = users.filter((u) => u.role === "VENDOR");
  const cannotScan = vendorish.filter((u) => !u.vendorId && !u.ownedVendor);
  console.log(`[audit] VENDOR users: ${vendorish.length}, cannot scan: ${cannotScan.length}`);
  for (const u of cannotScan) {
    console.log(`[audit]   NO BOOTH: ${u.email} | ${u.name} | company=${u.company ?? "-"}`);
  }

  // Emails that will never receive an invite or allow a login.
  const bad = users.filter((u) => !u.email || !u.email.includes("@") || PLACEHOLDER.test(u.email));
  console.log(`[audit] unusable emails: ${bad.length}`);
  for (const u of bad.slice(0, 80)) {
    console.log(`[audit]   BAD EMAIL: ${u.email} | ${u.name} | ${u.role}`);
  }

  const never = users.filter((u) => u.mustChangePassword);
  console.log(`[audit] never signed in (still on the shared password): ${never.length}`);

  const booths = await prisma.vendor.findMany({
    select: { name: true, _count: { select: { staff: true } }, userId: true },
    orderBy: { name: "asc" },
  });
  const empty = booths.filter((b) => b._count.staff === 0 && !b.userId);
  console.log(`[audit] booths: ${booths.length}, with nobody attached: ${empty.length}`);
  for (const b of empty) console.log(`[audit]   EMPTY BOOTH: ${b.name}`);
}

main().catch((e) => console.error("[audit] skipped:", e?.message ?? e)).finally(() => prisma.$disconnect());
