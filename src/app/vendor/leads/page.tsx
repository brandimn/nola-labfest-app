import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import Link from "next/link";

export default async function VendorLeadsPage() {
  const user = await requireRole("VENDOR", "ADMIN");
  const vendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
  if (!vendor) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-2xl font-bold">My Leads</h1>
        <p className="mt-4 text-slate-600">No vendor profile is linked to your account. Ask the admin to set this up.</p>
      </main>
    );
  }

  const leads = await prisma.lead.findMany({
    where: { vendorId: vendor.id },
    include: { attendee: { select: { name: true, email: true, company: true, title: true, phone: true } } },
    orderBy: { scannedAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">My Leads ({leads.length})</h1>
        {leads.length > 0 && (
          <Link href="/api/vendor/leads/export" className="btn-secondary text-sm">Export CSV</Link>
        )}
      </div>
      {leads.length === 0 ? (
        <p className="text-slate-500">No leads yet. Tap "Scan" to capture attendee badges.</p>
      ) : (
        <ul className="space-y-2">
          {leads.map((l) => (
            <li key={l.id} className="card p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{l.attendee.name}</p>
                  {l.attendee.title && <p className="text-sm text-slate-600">{l.attendee.title}</p>}
                  {l.attendee.company && <p className="text-sm text-slate-600">{l.attendee.company}</p>}
                  <a href={`mailto:${l.attendee.email}`} className="text-sm text-[#0F172A]">{l.attendee.email}</a>
                  {l.attendee.phone && (
                    <p className="text-sm text-slate-600">{l.attendee.phone}</p>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {new Date(l.scannedAt).toLocaleString("en-US", { timeZone: "America/New_York" })}
                </p>
              </div>
              {l.notes && <p className="mt-2 text-sm text-slate-700 italic">{l.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
