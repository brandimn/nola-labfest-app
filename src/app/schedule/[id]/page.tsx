import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatDay, formatTime } from "@/lib/utils";
import { FavoriteButton } from "@/components/favorite-button";

export default async function SessionDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const session = await prisma.session.findUnique({
    where: { id: params.id },
    include: { speakerRef: true },
  });
  if (!session) notFound();
  const fav = await prisma.favorite.findUnique({
    where: { userId_sessionId: { userId: user.id, sessionId: session.id } },
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/schedule" className="text-sm text-[#0F172A]">← Schedule</Link>
      <div className="card mt-3 p-5">
        <h1 className="font-display text-2xl font-bold">{session.title}</h1>
        {session.speakerRef ? (
          <Link
            href={`/speakers/${session.speakerRef.id}`}
            className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-[#B13E7D] hover:underline"
          >
            {session.speakerRef.name} →
          </Link>
        ) : (
          session.speaker && <p className="mt-1 text-slate-600">{session.speaker}</p>
        )}
        <p className="mt-2 text-sm text-slate-600">
          {formatDay(session.startsAt)}<br />
          {formatTime(session.startsAt)} – {formatTime(session.endsAt)}
          {session.location ? ` · ${session.location}` : ""}
        </p>
        {session.track && (
          <span className="inline-block mt-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs">
            {session.track}
          </span>
        )}
        {session.description && (
          <p className="mt-4 text-slate-700 whitespace-pre-wrap">{session.description}</p>
        )}
        <div className="mt-4">
          <FavoriteButton sessionId={session.id} initialFav={!!fav} />
        </div>
      </div>
    </main>
  );
}
