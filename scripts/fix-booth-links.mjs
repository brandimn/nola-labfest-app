// Attaches people to booths so they can scan leads, and reports which booths
// still have nobody so Brandi knows exactly what is missing.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const squash = (s) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

async function main() {
  const booths = await prisma.vendor.findMany({
    select: { id: true, name: true, userId: true, _count: { select: { staff: true } } },
    orderBy: { name: "asc" },
  });
  const users = await prisma.user.findMany({
    where: { role: { in: ["VENDOR", "ATTENDEE"] } },
    select: { id: true, name: true, email: true, company: true, role: true, vendorId: true },
  });

  // 1. People with no booth who clearly belong to one.
  const loose = users.filter((u) => u.role === "VENDOR" && !u.vendorId);
  const attached = [];
  for (const u of loose) {
    const c = squash(u.company);
    if (!c) continue;
    const match = booths.find((b) => {
      const n = squash(b.name);
      return n && (n === c || c.startsWith(n) || n.startsWith(c));
    });
    if (match) {
      await prisma.user.update({ where: { id: u.id }, data: { vendorId: match.id } });
      attached.push(`${u.name} -> ${match.name}`);
    }
  }
  console.log(`[links] attached by company name (${attached.length}): ${attached.join(" | ") || "none"}`);

  // 2. Booths still with nobody, and who in the system might belong to them.
  const fresh = await prisma.vendor.findMany({
    select: { id: true, name: true, userId: true, _count: { select: { staff: true } } },
    orderBy: { name: "asc" },
  });
  const stillEmpty = fresh.filter((b) => b._count.staff === 0 && !b.userId);
  console.log(`[links] booths with nobody attached: ${stillEmpty.length}`);
  for (const b of stillEmpty) {
    const n = squash(b.name);
    const candidates = users.filter((u) => {
      const c = squash(u.company);
      const e = (u.email ?? "").toLowerCase();
      return (c && (c.includes(n) || n.includes(c))) || (n.length > 3 && e.includes(n.slice(0, 5)));
    });
    console.log(
      `[links]   ${b.name}: ${
        candidates.length
          ? candidates.map((c) => `${c.name} <${c.email}> [${c.role}]`).join(" ; ")
          : "nobody in the system looks like them"
      }`
    );
  }
}

main().catch((e) => console.error("[links] skipped:", e?.message ?? e)).finally(() => prisma.$disconnect());
