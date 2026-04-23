import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function csvEscape(v: string | null | undefined) {
  if (v == null) return "";
  const s = String(v);
  if (/[,"\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const vendor = await prisma.vendor.findUnique({ where: { userId: session.user.id } });
  if (!vendor) return NextResponse.json({ error: "No vendor profile" }, { status: 400 });

  const leads = await prisma.lead.findMany({
    where: { vendorId: vendor.id },
    include: { attendee: true },
    orderBy: { scannedAt: "asc" },
  });

  const rows = [
    ["Name", "Email", "Company", "Title", "Phone", "Notes", "Tags", "Captured At"].join(","),
    ...leads.map((l) =>
      [
        l.attendee.name,
        l.attendee.email,
        l.attendee.company,
        l.attendee.title,
        l.attendee.phone,
        l.notes,
        l.tags,
        l.scannedAt.toISOString(),
      ].map(csvEscape).join(",")
    ),
  ];
  const csv = rows.join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${vendor.name.replace(/[^a-z0-9]/gi, "_")}.csv"`,
    },
  });
}
