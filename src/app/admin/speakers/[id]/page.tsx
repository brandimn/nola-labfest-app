import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { SpeakerForm } from "@/components/speaker-form";

export const dynamic = "force-dynamic";

export default async function EditSpeakerPage({ params }: { params: { id: string } }) {
  await requireRole("ADMIN");
  const speaker = await prisma.speaker.findUnique({
    where: { id: params.id },
    include: { sessions: { select: { id: true, title: true, startsAt: true } } },
  });
  if (!speaker) notFound();

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <Link href="/admin/speakers" className="text-sm text-slate-500">← Speakers</Link>
      <h1 className="mt-3 mb-1 font-display text-2xl font-bold">{speaker.name}</h1>
      <p className="mb-4 text-sm text-slate-600">
        {speaker.sessions.length}{" "}
        {speaker.sessions.length === 1 ? "session assigned" : "sessions assigned"}
      </p>
      <SpeakerForm
        mode="edit"
        initial={{
          id: speaker.id,
          name: speaker.name,
          title: speaker.title ?? "",
          company: speaker.company ?? "",
          bio: speaker.bio ?? "",
          linkedIn: speaker.linkedIn ?? "",
          photoUrl: speaker.photoUrl ?? "",
        }}
      />

      {speaker.sessions.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Assigned sessions
          </h2>
          <ul className="space-y-1">
            {speaker.sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/admin/schedule/${s.id}`}
                  className="card block p-3 hover:shadow-md transition"
                >
                  <p className="font-medium">{s.title}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(s.startsAt).toLocaleString("en-US", {
                      weekday: "short",
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: "America/New_York",
                    })}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
