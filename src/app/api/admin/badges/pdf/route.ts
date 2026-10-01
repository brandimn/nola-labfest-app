import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import QRCode from "qrcode";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildBadgesPdf } from "@/lib/badge-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getBgBytes(req: NextRequest, settingVal: string | undefined): Promise<Uint8Array> {
  if (settingVal && settingVal.startsWith("data:")) {
    const base64 = settingVal.split(",")[1] ?? "";
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
  const url =
    settingVal && settingVal.startsWith("http")
      ? settingVal
      : new URL(settingVal || "/badge-bg-nola.jpg", req.url).toString();
  const res = await fetch(url);
  return new Uint8Array(await res.arrayBuffer());
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const since = req.nextUrl.searchParams.get("since")?.trim();
  const sinceDate = since && !isNaN(Date.parse(since)) ? new Date(since) : null;

  const attendees = await prisma.user.findMany({
    where: {
      badgeType: { not: null },
      ...(sinceDate ? { createdAt: { gte: sinceDate } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { company: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    select: { name: true, company: true, state: true, badgeType: true, badgeToken: true },
  });

  const bgSetting = await prisma.setting.findUnique({ where: { key: "badgeBackgroundUrl" } });
  const bgBytes = await getBgBytes(req, bgSetting?.value);

  const badges = await Promise.all(
    attendees.map(async (a) => ({
      name: a.name,
      company: a.company,
      state: a.state,
      badgeType: a.badgeType,
      qrPng: new Uint8Array(
        await QRCode.toBuffer(a.badgeToken, {
          type: "png",
          width: 300,
          margin: 0,
          color: { dark: "#0F172A", light: "#ffffff" },
        })
      ),
    }))
  );

  const pdfBytes = await buildBadgesPdf({ badges, bgBytes });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="nola-labfest-badges-${stamp}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
