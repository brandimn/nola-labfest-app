import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const attendee = await prisma.user.findUnique({ where: { email: "attendee@example.com" } });
  if (!attendee) { console.error("attendee not found"); return; }
  const vendors = await prisma.vendor.findMany({ take: 14 });
  for (const v of vendors) {
    await prisma.boothScan.upsert({
      where: { attendeeId_vendorId: { attendeeId: attendee.id, vendorId: v.id } },
      update: {},
      create: { attendeeId: attendee.id, vendorId: v.id },
    });
  }
  console.log(`seeded ${vendors.length} demo scans for ${attendee.email}`);
}

main().finally(() => prisma.$disconnect());
