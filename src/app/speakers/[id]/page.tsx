import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ArrowLeft, ExternalLink, Calendar, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SpeakerDetailPage({ params }: { params: { id: string } }) {
  await requireUser();
  const speaker = await prisma.speaker.findUnique({
    where: { id: params.id },
    include: {
      sessions: { orderBy: { startsAt: "asc" } },
    },
  });
  if (!speaker) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/speakers" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> All speakers
      </Link>

      <section className="card overflow-hidden mb-6">
        <div className="h-24 bg-gradient-to-r from-[#3D1E50] via-[#B13E7D] to-[#F5A547]" />
        <div className="px-6 pb-6 -mt-12">
          <div className="h-24 w-24 rounded-full border-4 border-white bg-slate-100 shadow-md overflow-hidden">
            {speaker.photoUrl ? (
              <img src={speaker.photoUrl} alt={speaker.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-[#3D1E50] via-[#B13E7D] to-[#F5A547] flex items-center justify-center text-white font-display text-2xl font-bold">
                {initials(speaker.name)}
              </div>
            )}
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold">{speaker.name}</h1>
          {speaker.title && <p className="text-slate-700">{speaker.title}</p>}
          {speaker.company && <p className="text-sm font-semibold text-[#B13E7D]">{speaker.company}</p>}
          {speaker.linkedIn && (
            <a
              href={speaker.linkedIn}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm text-[#0F172A] underline"
            >
              <ExternalLink className="h-4 w-4" /> LinkedIn
            </a>
          )}
          {speaker.bio && (
            <p className="mt-4 text-slate-700 leading-relaxed">{speaker.bio}</p>
          )}
        </div>
      </section>

      <h2 className="mb-2 font-display text-xl font-bold">Sessions</h2>
      {speaker.sessions.length === 0 ? (
        <p className="text-sm text-slate-500">No sessions yet.</p>
      ) : (
        <ul className="space-y-2">
          {speaker.sessions.map((s) => (
            <li key={s.id}>
              <Link href={`/schedule/${s.id}`} className="card block p-4 hover:shadow-md transition">
                <p className="font-semibold">{s.title}</p>
                <p className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(s.startsAt).toLocaleString("en-US", {
                      weekday: "short",
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: "America/New_York",
                    })}
                  </span>
                  {s.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {s.location}
                    </span>
                  )}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter((p) => !/^(Dr|Mr|Mrs|Ms|Prof)\.?$/i.test(p))
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}
