import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Mail, Phone } from "lucide-react";

export const dynamic = "force-dynamic";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export default async function TeamPage() {
  await requireUser();
  const team = await prisma.teamMember.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-5">
        <h1 className="font-display text-4xl font-extrabold gradient-text">Nowak Team</h1>
        <p className="mt-1 text-sm text-slate-600">
          82 years strong and still family run. Come say hey, and reach out any time.
        </p>
      </header>

      {team.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">Team coming soon.</div>
      ) : (
        <ul className="space-y-3">
          {team.map((m) => (
            <li key={m.id} className="card flex items-center gap-4 p-4">
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-sm">
                {m.photoUrl ? (
                  <img src={m.photoUrl} alt={m.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#7C3AED] via-[#B13E7D] to-[#F5A547] font-display text-lg font-bold text-white">
                    {initials(m.name)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-bold leading-tight">{m.name}</p>
                {m.title && <p className="text-sm font-semibold text-[#B13E7D]">{m.title}</p>}
                <div className="mt-1.5 flex flex-col gap-1">
                  {m.email && (
                    <a
                      href={`mailto:${m.email}`}
                      className="inline-flex items-center gap-1.5 text-sm text-[#0F172A] hover:underline"
                    >
                      <Mail className="h-3.5 w-3.5 text-[#7C3AED]" /> {m.email}
                    </a>
                  )}
                  {m.phone && (
                    <a
                      href={`tel:${m.phone}`}
                      className="inline-flex items-center gap-1.5 text-sm text-[#0F172A] hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5 text-[#0E8C4B]" /> {m.phone}
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
