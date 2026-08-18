import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { SpeakerForm } from "@/components/speaker-form";

export default async function AdminSpeakerEditPage({ params }: { params: { id: string } }) {
  await requireRole("ADMIN");
  const s = await prisma.speaker.findUnique({
    where: { id: params.id },
    include: { sessions: { orderBy: { startsAt: "asc" } } },
  });
  if (!s) notFound();
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/admin/speakers" className="text-sm text-[#0F172A]">← Speakers</Link>
      <h1 className="mt-3 mb-4 text-2xl font-bold">Edit Speaker</h1>
      <SpeakerForm initial={s} />
      <div className="card mt-6 p-5">
        <h2 className="font-semibold mb-2">Sessions</h2>
        {s.sessions.length === 0 ? (
          <p className="text-sm text-slate-500">
            Not attached to a session yet. Add one from the Schedule screen.
          </p>
        ) : (
          <ul className="divide-y text-sm">
            {s.sessions.map((sess) => (
              <li key={sess.id} className="py-2">
                <Link href={`/admin/schedule/${sess.id}`} className="hover:underline">
                  <span className="font-medium">{sess.title}</span>
                  <span className="block text-xs text-slate-500">
                    {sess.startsAt.toLocaleString("en-US", {
                      weekday: "short", month: "short", day: "numeric",
                      hour: "numeric", minute: "2-digit",
                    })}
                    {sess.location ? ` · ${sess.location}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
