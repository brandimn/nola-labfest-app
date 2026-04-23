import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPass = await bcrypt.hash("changeme-admin", 10);
  const vendorPass = await bcrypt.hash("changeme-vendor", 10);
  const attendeePass = await bcrypt.hash("changeme-attendee", 10);

  await prisma.user.upsert({
    where: { email: "brandi@nowakdental.com" },
    update: {},
    create: {
      email: "brandi@nowakdental.com",
      password: adminPass,
      name: "Brandi Nowak Dalton",
      role: "ADMIN",
    },
  });

  const sampleVendors: Array<{
    name: string;
    boothNumber: string;
    category: string;
    sponsorTier?: string;
  }> = [
    { name: "BonaDent Dental Labs", boothNumber: "101", category: "Lab", sponsorTier: "PLATINUM" },
    { name: "Nowak Dental Supplies", boothNumber: "102", category: "Supplies", sponsorTier: "PLATINUM" },
    { name: "Nowak Pediatric", boothNumber: "103", category: "Supplies", sponsorTier: "GOLD" },
    { name: "Nowak Lab Solutions", boothNumber: "104", category: "Lab", sponsorTier: "GOLD" },
    { name: "3M Oral Care", boothNumber: "105", category: "Products", sponsorTier: "GOLD" },
    { name: "Dentsply Sirona", boothNumber: "106", category: "Equipment", sponsorTier: "SILVER" },
    { name: "Straumann", boothNumber: "107", category: "Implants", sponsorTier: "SILVER" },
    { name: "Nobel Biocare", boothNumber: "108", category: "Implants", sponsorTier: "SILVER" },
    { name: "Kerr Dental", boothNumber: "109", category: "Products", sponsorTier: "BRONZE" },
    { name: "Ivoclar Vivadent", boothNumber: "110", category: "Products", sponsorTier: "BRONZE" },
    { name: "Ultradent", boothNumber: "201", category: "Products" },
    { name: "Shofu Dental", boothNumber: "202", category: "Products" },
    { name: "Premier Dental", boothNumber: "203", category: "Products" },
    { name: "Hu-Friedy", boothNumber: "204", category: "Instruments" },
    { name: "A-dec", boothNumber: "205", category: "Equipment" },
    { name: "Planmeca", boothNumber: "206", category: "Equipment" },
    { name: "KaVo Kerr", boothNumber: "207", category: "Equipment" },
    { name: "NSK Dental", boothNumber: "208", category: "Equipment" },
    { name: "Brasseler USA", boothNumber: "209", category: "Burs" },
    { name: "Komet USA", boothNumber: "210", category: "Burs" },
    { name: "Septodont", boothNumber: "301", category: "Pharma" },
    { name: "Colgate Professional", boothNumber: "302", category: "Hygiene" },
    { name: "Crest Oral-B", boothNumber: "303", category: "Hygiene" },
    { name: "Philips Sonicare", boothNumber: "304", category: "Hygiene" },
    { name: "Dentrix", boothNumber: "305", category: "Software" },
    { name: "Eaglesoft", boothNumber: "306", category: "Software" },
    { name: "Weave", boothNumber: "307", category: "Software" },
    { name: "Carestream Dental", boothNumber: "308", category: "Imaging" },
    { name: "Vatech America", boothNumber: "309", category: "Imaging" },
    { name: "SprintRay", boothNumber: "310", category: "3D Printing" },
  ];

  for (const v of sampleVendors) {
    const existing = await prisma.vendor.findFirst({ where: { name: v.name } });
    if (!existing) {
      await prisma.vendor.create({
        data: {
          name: v.name,
          boothNumber: v.boothNumber,
          category: v.category,
          sponsorTier: v.sponsorTier,
          description: `Visit ${v.name} at booth ${v.boothNumber} to learn more about our ${v.category.toLowerCase()} offerings.`,
        },
      });
    } else if (v.sponsorTier && !existing.sponsorTier) {
      await prisma.vendor.update({
        where: { id: existing.id },
        data: { sponsorTier: v.sponsorTier },
      });
    }
  }

  // Sample test vendor user linked to first vendor
  const testVendor = await prisma.vendor.findFirst({ where: { name: "BonaDent Dental Labs" } });
  if (testVendor && !testVendor.userId) {
    const vendorUser = await prisma.user.upsert({
      where: { email: "vendor@example.com" },
      update: {},
      create: {
        email: "vendor@example.com",
        password: vendorPass,
        name: "Test Vendor",
        role: "VENDOR",
        company: testVendor.name,
      },
    });
    await prisma.vendor.update({
      where: { id: testVendor.id },
      data: { userId: vendorUser.id },
    });
  }

  // Sample attendee
  await prisma.user.upsert({
    where: { email: "attendee@example.com" },
    update: {},
    create: {
      email: "attendee@example.com",
      password: attendeePass,
      name: "Test Attendee",
      role: "ATTENDEE",
      company: "Demo Dental",
      title: "Office Manager",
    },
  });

  // Speakers
  const speakers = [
    {
      name: "Dr. Jane Smith",
      title: "Chief Innovation Officer",
      company: "DentalFuture Group",
      bio: "Dr. Smith leads innovation strategy at DentalFuture Group. A 20-year veteran of dental practice, she speaks internationally on workflow modernization and the integration of AI in clinical care.",
    },
    {
      name: "Dr. Robert Lee",
      title: "Digital Dentistry Specialist",
      company: "Lee Dental Institute",
      bio: "Dr. Lee pioneered the digital workflow curriculum at three major US dental schools. His hands-on masterclasses have trained over 2,000 clinicians in fully digital restorative workflows.",
    },
    {
      name: "Dr. Maria Chen",
      title: "Implantologist",
      company: "Chen Oral Surgery",
      bio: "Board-certified oral surgeon specializing in full-arch implant rehabilitation. Dr. Chen has published over 40 peer-reviewed articles on digital case planning and guided surgery.",
    },
    {
      name: "Lisa Gomez",
      title: "Practice Management Consultant",
      company: "Bright Practice Advisors",
      bio: "Lisa helps dental practices optimize their insurance billing and revenue cycle management. Her workshops have helped 400+ practices increase collections by 15% or more.",
    },
    {
      name: "Dr. Karen White",
      title: "Cosmetic Dentist",
      company: "Smile Design Studio",
      bio: "Dr. White is recognized nationally for her work in aesthetic dentistry and minimally invasive techniques. She hosts the top-rated Cosmetic Dental Weekly podcast.",
    },
  ];

  for (const s of speakers) {
    const existing = await prisma.speaker.findFirst({ where: { name: s.name } });
    if (!existing) await prisma.speaker.create({ data: s });
  }

  // Sample sessions — link to speakers
  const day1 = new Date("2026-10-10T08:00:00-04:00");
  const day2 = new Date("2026-10-11T08:00:00-04:00");

  const existingSessions = await prisma.session.count();
  if (existingSessions === 0) {
    const speakersByName = Object.fromEntries(
      (await prisma.speaker.findMany()).map((s) => [s.name, s])
    );
    const sessions = [
      { title: "Welcome Breakfast", startsAt: addHours(day1, 0), endsAt: addHours(day1, 1), location: "Main Hall", track: "Social" },
      { title: "Keynote: The Future of Dental Practice", speaker: "Dr. Jane Smith", speakerId: speakersByName["Dr. Jane Smith"]?.id, startsAt: addHours(day1, 1), endsAt: addHours(day1, 2), location: "Main Hall", track: "Business" },
      { title: "Exhibit Hall Open", startsAt: addHours(day1, 2), endsAt: addHours(day1, 8), location: "Exhibit Hall", track: "Business" },
      { title: "Digital Workflow Masterclass", speaker: "Dr. Robert Lee", speakerId: speakersByName["Dr. Robert Lee"]?.id, startsAt: addHours(day1, 3), endsAt: addHours(day1, 5), location: "Room A", track: "Technology" },
      { title: "Implant Case Planning", speaker: "Dr. Maria Chen", speakerId: speakersByName["Dr. Maria Chen"]?.id, startsAt: addHours(day1, 5), endsAt: addHours(day1, 7), location: "Room B", track: "Clinical" },
      { title: "Networking Reception", startsAt: addHours(day1, 9), endsAt: addHours(day1, 11), location: "Terrace", track: "Social" },
      { title: "Day 2 Breakfast", startsAt: addHours(day2, 0), endsAt: addHours(day2, 1), location: "Main Hall", track: "Social" },
      { title: "Insurance & Billing Workshop", speaker: "Lisa Gomez", speakerId: speakersByName["Lisa Gomez"]?.id, startsAt: addHours(day2, 1), endsAt: addHours(day2, 3), location: "Room A", track: "Business" },
      { title: "Aesthetic Dentistry Techniques", speaker: "Dr. Karen White", speakerId: speakersByName["Dr. Karen White"]?.id, startsAt: addHours(day2, 3), endsAt: addHours(day2, 5), location: "Room B", track: "Clinical" },
      { title: "Prize Drawing & Closing", startsAt: addHours(day2, 8), endsAt: addHours(day2, 9), location: "Main Hall", track: "Social" },
    ];
    for (const s of sessions) {
      await prisma.session.create({ data: s });
    }
  } else {
    // If sessions already exist, backfill speaker links by name
    const existingSpeakers = await prisma.speaker.findMany();
    for (const sp of existingSpeakers) {
      await prisma.session.updateMany({
        where: { speaker: sp.name, speakerId: null },
        data: { speakerId: sp.id },
      });
    }
  }

  console.log("Seed complete.");
}

function addHours(d: Date, h: number) {
  return new Date(d.getTime() + h * 60 * 60 * 1000);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
