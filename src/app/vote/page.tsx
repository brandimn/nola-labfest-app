import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { VoteList } from "@/components/vote-list";
import Link from "next/link";

export default async function VotePage() {
  const user = await requireUser();

  const [vendors, existingVote] = await Promise.all([
    prisma.vendor.findMany({
      orderBy: { boothNumber: "asc" },
      select: {
        id: true,
        name: true,
        boothNumber: true,
        logoUrl: true,
        category: true,
      },
    }),
    user.role === "ATTENDEE"
      ? prisma.boothVote.findUnique({ where: { attendeeId: user.id } })
      : Promise.resolve(null),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Best Decorated Booth</h1>
        <p className="text-sm text-slate-600">
          Vote for your favorite New Orleans–themed booth. You can change your vote until voting closes.
        </p>
      </header>

      {user.role !== "ATTENDEE" ? (
        <div className="card p-4 text-sm text-slate-700">
          Only attendees can vote. This page is a preview of the voting experience.
          {user.role === "ADMIN" && (
            <div className="mt-2">
              <Link href="/admin/voting" className="text-[#0F172A] font-medium">
                See live results →
              </Link>
            </div>
          )}
        </div>
      ) : (
        <VoteList vendors={vendors} initialVendorId={existingVote?.vendorId ?? null} />
      )}
    </main>
  );
}
