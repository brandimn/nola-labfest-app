import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getMyBooth } from "@/lib/booth";
import { getUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function BadgeRedirect({ params }: { params: { token: string } }) {
  const viewer = await getUser();
  const attendee = await prisma.user.findUnique({
    where: { badgeToken: params.token },
    select: { id: true, name: true, email: true, company: true, title: true, phone: true },
  });
  if (!attendee) redirect("/");

  const isVendorOrAdmin = viewer?.role === "VENDOR" || viewer?.role === "ADMIN";

  // If a signed-in vendor lands here (e.g. scanned with the phone camera), capture the lead.
  let captured = false;
  if (viewer?.role === "VENDOR") {
    const vendor = await getMyBooth(viewer.id);
    if (vendor) {
      try {
        await prisma.lead.upsert({
          where: { vendorId_attendeeId: { vendorId: vendor.id, attendeeId: attendee.id } },
          create: { vendorId: vendor.id, attendeeId: attendee.id },
          update: {},
        });
        captured = true;
      } catch {}
    }
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-8">
      <div className="card p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#7C3AED]">Attendee Badge</p>
        <h1 className="mt-2 font-display text-2xl font-bold">{attendee.name}</h1>
        {attendee.title && <p className="text-slate-600">{attendee.title}</p>}
        {attendee.company && <p className="text-slate-600">{attendee.company}</p>}

        {isVendorOrAdmin ? (
          <>
            <p className="mt-2 text-sm text-slate-500">{attendee.email}</p>
            {attendee.phone && <p className="text-sm text-slate-500">{attendee.phone}</p>}
            {captured && (
              <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                ✓ Captured to your leads
              </p>
            )}
          </>
        ) : (
          <p className="mt-4 text-xs text-slate-400">
            {viewer ? (
              "Only vendors can capture leads."
            ) : (
              <>
                <Link href="/login" className="font-semibold text-[#7C3AED] underline">
                  Sign in as a vendor
                </Link>{" "}
                to capture this lead.
              </>
            )}
          </p>
        )}
      </div>
    </main>
  );
}
