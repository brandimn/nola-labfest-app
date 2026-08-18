import Link from "next/link";
import { Sparkles, Calendar, MapPin } from "lucide-react";

type SpeakerSlim = { id: string; name: string; title: string | null; company: string | null } | null;

type Session = {
  id: string;
  title: string;
  speaker: string | null;
  speakerRef?: SpeakerSlim;
  location: string | null;
  startsAt: Date | string;
  endsAt: Date | string;
};

export function FeaturedSessionCard({
  session,
  compact,
}: {
  session: Session;
  compact?: boolean;
}) {
  const speakerName = session.speakerRef?.name || session.speaker || null;
  const speakerDetail =
    session.speakerRef?.title || session.speakerRef?.company || null;

  return (
    <Link
      href={`/schedule/${session.id}`}
      className="relative block overflow-hidden rounded-2xl shadow-lg transition hover:shadow-xl"
      style={{
        background:
          "linear-gradient(135deg, #000000 0%, #141414 55%, #2B1F0E 100%)",
      }}
    >
      {/* subtle gold foil shimmer line */}
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, #D4AF37 50%, transparent 100%)",
        }}
      />
      <div className={compact ? "p-4" : "p-5"}>
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-flex items-center gap-1 rounded-full border text-[10px] font-bold uppercase tracking-[0.2em] px-2.5 py-1"
            style={{ color: "#D4AF37", borderColor: "#D4AF37" }}
          >
            <Sparkles className="h-3 w-3" />
            Exclusive · Masterclass
          </span>
        </div>

        <p
          className={`font-display font-bold leading-tight text-white ${compact ? "text-xl" : "text-2xl"}`}
        >
          {session.title}
        </p>

        {speakerName && (
          <p className="mt-1.5 text-sm font-semibold" style={{ color: "#D4AF37" }}>
            with {speakerName}
            {speakerDetail ? (
              <span className="ml-1 font-normal text-white/70">· {speakerDetail}</span>
            ) : null}
          </p>
        )}

        <p className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/75">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(session.startsAt).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              timeZone: "America/Chicago",
            })}
            {" · "}
            {new Date(session.startsAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              timeZone: "America/Chicago",
            })}
            {" – "}
            {new Date(session.endsAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              timeZone: "America/Chicago",
            })}
          </span>
          {session.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {session.location}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
