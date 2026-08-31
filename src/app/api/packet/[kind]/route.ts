import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// The packets contain the shared LabFest password in plain text, so they must
// never sit on a public URL. They live outside /public and are only handed over
// to someone already signed in who is actually a vendor or a speaker.
const KINDS = {
  vendor: { base: "vendor-packet", name: "NOLA LabFest 2026 Vendor Packet" },
  speaker: { base: "speaker-packet", name: "NOLA LabFest 2026 Speaker Packet" },
} as const;

// PDF first: iOS Safari renders a PDF inline but shows a blank page for a Word
// file, so a Word file has to be sent as a download instead of displayed.
const FORMATS = [
  { ext: "pdf", type: "application/pdf", disposition: "inline" },
  {
    ext: "docx",
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    disposition: "attachment",
  },
] as const;

export async function GET(req: NextRequest, { params }: { params: { kind: string } }) {
  const kind = params.kind as keyof typeof KINDS;
  if (!KINDS[kind]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.redirect(new URL("/login", req.url));

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      vendorId: true,
      ownedVendor: { select: { id: true } },
      ownedSpeaker: { select: { id: true } },
    },
  });
  const allowed =
    me?.role === "ADMIN" ||
    (kind === "vendor" && !!(me?.vendorId || me?.ownedVendor)) ||
    (kind === "speaker" && !!me?.ownedSpeaker);

  if (!allowed) {
    return NextResponse.json({ error: "That packet is not for your account" }, { status: 403 });
  }

  // "Save a copy" forces a download even for a PDF, which otherwise displays.
  const forceDownload = req.nextUrl.searchParams.get("download") === "1";

  for (const fmt of FORMATS) {
    try {
      const buf = await readFile(
        path.join(process.cwd(), "packets", `${KINDS[kind].base}.${fmt.ext}`)
      );
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": fmt.type,
          "Content-Length": String(buf.length),
          "Content-Disposition": `${forceDownload ? "attachment" : fmt.disposition}; filename="${KINDS[kind].name}.${fmt.ext}"`,
          "Cache-Control": "private, max-age=300",
        },
      });
    } catch {
      // try the next format
    }
  }

  return NextResponse.json(
    { error: "That packet has not been uploaded yet. Tell Brandi." },
    { status: 404 }
  );
}
