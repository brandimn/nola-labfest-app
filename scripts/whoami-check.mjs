// Read only. Lists admin accounts so we can see whether Brandi's login still
// exists after today's roster and register changes. Emails only, no secrets.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, email: true, name: true, mustChangePassword: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`[whoami] admin accounts: ${admins.length}`);
  for (const a of admins) {
    console.log(`[whoami]   ${a.email} | ${a.name} | mustChange=${a.mustChangePassword} | ${a.createdAt.toISOString().slice(0,10)}`);
  }
  const brandi = await prisma.user.findMany({
    where: { OR: [{ email: { contains: "brandi" } }, { name: { contains: "Brandi" } }] },
    select: { email: true, name: true, role: true, mustChangePassword: true },
  });
  console.log(`[whoami] accounts matching Brandi: ${brandi.length}`);
  for (const b of brandi) {
    console.log(`[whoami]   ${b.email} | ${b.name} | ${b.role} | mustChange=${b.mustChangePassword}`);
  }
}
main().catch((e) => console.error("[whoami] skipped:", e?.message ?? e)).finally(() => prisma.$disconnect());
