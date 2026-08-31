import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const KINDS = {
  vendor: { title: "Vendor Packet", blurb: "Everything you need for the show." },
  speaker: { title: "Speaker Packet", blurb: "Everything you need for your session." },
} as const;

export default async function PacketPage({ params }: { params: { kind: string } }) {
  const kind = params.kind as keyof typeof KINDS;
  if (!KINDS[kind]) notFound();

  const user = await requireUser();
  const me = await prisma.user.findUnique({
    where: { id: user.id },
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
  if (!allowed) redirect("/");

  const file = `/api/packet/${kind}`;

  return (
    <main className="mx-auto max-w-2xl px-4 py-5">
      {/* Opening a PDF straight from the home screen app leaves people stranded
          with no browser chrome to go back with, so the packet gets a real page
          with its own way out. */}
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-[#0F172A]">
        <ArrowLeft className="h-4 w-4" /> Back to home
      </Link>

      <h1 className="mt-3 font-display text-2xl font-bold">Your {KINDS[kind].title}</h1>
      <p className="mb-4 text-sm text-slate-600">{KINDS[kind].blurb}</p>

      <div className="mb-4 flex flex-wrap gap-2">
        <a href={file} target="_blank" rel="noreferrer" className="btn-primary text-sm">
          <ExternalLink className="mr-2 h-4 w-4" /> Open full screen
        </a>
        <a href={`${file}?download=1`} className="btn-secondary text-sm">
          <Download className="mr-2 h-4 w-4" /> Save a copy
        </a>
      </div>

      <div className="card overflow-hidden" style={{ height: "70vh" }}>
        <object data={file} type="application/pdf" className="h-full w-full">
          {/* iPhones often refuse to render a PDF inside a page, so say so
              rather than leaving a blank rectangle. */}
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-slate-600">
              Your phone will not show the packet inside the app.
            </p>
            <a href={file} target="_blank" rel="noreferrer" className="btn-primary text-sm">
              Open the packet
            </a>
          </div>
        </object>
      </div>
    </main>
  );
}
