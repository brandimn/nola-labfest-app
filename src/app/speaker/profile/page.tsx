import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { MySpeakerForm } from "@/components/my-speaker-form";

export default async function MySpeakerProfilePage() {
  const user = await requireUser();
  const profile = await prisma.speaker.findUnique({
    where: { userId: user.id },
    include: { sessions: { orderBy: { startsAt: "asc" } } },
  });
  if (!profile) redirect("/me");
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/me" className="text-sm text-[#0F172A]">← My Account</Link>
      <h1 className="mt-3 mb-4 text-2xl font-bold">My Speaker Profile</h1>
      <MySpeakerForm initial={profile} />
      {profile.sessions.length > 0 && (
        <div className="card mt-6 p-5">
          <h2 className="font-semibold mb-2">Your sessions</h2>
          <ul className="divide-y text-sm">
            {profile.sessions.map((s) => (
              <li key={s.id} className="py-2">
                <span className="font-medium">{s.title}</span>
                <span className="block text-xs text-slate-500">
                  {s.startsAt.toLocaleString("en-US", {
                    weekday: "long", month: "short", day: "numeric",
                    hour: "numeric", minute: "2-digit",
                  })}
                  {s.location ? ` · ${s.location}` : ""}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Session times are set by the LabFest team. Reach out if something looks wrong.
          </p>
        </div>
      )}
    </main>
  );
}
