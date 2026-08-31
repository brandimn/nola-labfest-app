import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// The packets contain the shared LabFest password in plain text, so they must
// never sit on a public URL. They live outside /public and are only handed over
// to someone already signed in who is actually a vendor or a speaker.
const FILES = {
  vendor: { file: "vendor-packet.docx", name: "NOLA LabFest 2026 Vendor Packet.docx" },
  speaker: { file: "speaker-packet.docx", name: "NOLA LabFest 2026 Speaker Packet.docx" },
} as const;

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function GET(_req: NextRequest, { params }: { params: { kind: string } }) {
  const kind = params.kind as keyof typeof FILES;
  if (!FILES[kind]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.redirect(new URL("/login", _req.url));

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      vendorId: true,
      ownedVendor: { select: { id: true } },
      ownedSpeaker: { select: { id: true } },
    },
  });
  const isAdmin = me?.role === "ADMIN";
  const allowed =
    isAdmin ||
    (kind === "vendor" && !!(me?.vendorId || me?.ownedVendor)) ||
    (kind === "speaker" && !!me?.ownedSpeaker);

  if (!allowed) {
    return NextResponse.json({ error: "That packet is not for your account" }, { status: 403 });
  }

  try {
    const buf = await readFile(path.join(process.cwd(), "packets", FILES[kind].file));
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": DOCX,
        // inline so phones preview it rather than dumping it straight to Files
        "Content-Disposition": `inline; filename="${FILES[kind].name}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "Packet is not uploaded yet" }, { status: 404 });
  }
}
