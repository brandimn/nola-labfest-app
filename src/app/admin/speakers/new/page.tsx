import Link from "next/link";
import { requireRole } from "@/lib/session";
import { SpeakerForm } from "@/components/speaker-form";

export default async function NewSpeakerPage() {
  await requireRole("ADMIN");
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/admin/speakers" className="text-sm text-[#0F172A]">← Speakers</Link>
      <h1 className="mt-3 mb-4 text-2xl font-bold">New Speaker</h1>
      <SpeakerForm />
    </main>
  );
}
