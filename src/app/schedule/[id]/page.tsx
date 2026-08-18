import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatDay, formatTime } from "@/lib/utils";
import { FavoriteButton } from "@/components/favorite-button";
import { Sparkles } from "lucide-react";

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

  // Featured = exclusive / masterclass black-and-gold treatment
  if (session.isFeatured) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Link href="/schedule" className="text-sm text-slate-500">← Schedule</Link>
        <article
          className="relative mt-3 overflow-hidden rounded-2xl shadow-xl"
          style={{
            background:
              "linear-gradient(135deg, #000000 0%, #141414 55%, #2B1F0E 100%)",
          }}
        >
          <div
            className="absolute inset-x-0 top-0 h-[3px]"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, #D4AF37 50%, transparent 100%)",
            }}
          />
          <div className="p-6 text-white">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border text-[10px] font-bold uppercase tracking-[0.25em] px-3 py-1"
              style={{ color: "#D4AF37", borderColor: "#D4AF37" }}
            >
              <Sparkles className="h-3 w-3" />
              Exclusive · Masterclass
            </span>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight">
              {session.title}
            </h1>
            {session.speakerRef ? (
              <Link
                href={`/speakers/${session.speakerRef.id}`}
                className="mt-2 inline-flex items-center gap-1 text-base font-semibold hover:underline"
                style={{ color: "#D4AF37" }}
              >
                with {session.speakerRef.name} →
              </Link>
            ) : (
              session.speaker && (
                <p className="mt-2 text-base font-semibold" style={{ color: "#D4AF37" }}>
                  with {session.speaker}
                </p>
              )
            )}
            <p className="mt-4 text-sm text-white/80">
              {formatDay(session.startsAt)}
              <br />
              {formatTime(session.startsAt)} – {formatTime(session.endsAt)}
              {session.location ? ` · ${session.location}` : ""}
            </p>
            {session.description && (
              <p className="mt-5 text-white/90 leading-relaxed whitespace-pre-wrap">
                {session.description}
              </p>
            )}
            <div className="mt-5 rounded-lg border border-white/15 bg-white/5 p-3 text-xs text-white/70">
              Seats are strictly limited and by invitation only. If you're here, your spot is secured.
            </div>
          </div>
        </article>
        <div className="mt-4">
          <FavoriteButton sessionId={session.id} initialFav={!!fav} />
        </div>
      </main>
    );
  }

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
