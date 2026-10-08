import Link from "next/link";
import { requireUser } from "@/lib/session";
import { ArrowLeft, Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AgendaViewPage() {
  await requireUser();
  return (
    <main className="mx-auto max-w-3xl px-4 py-4 pb-24">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Link
          href="/schedule"
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#7C3AED]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to schedule
        </Link>
        <a
          href="/labfest-agenda-2026.pdf"
          download
          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
        >
          <Download className="h-4 w-4" /> Download PDF
        </a>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <img src="/agenda-2026.png" alt="LabFest 2026 agenda" className="w-full" />
      </div>
      <p className="mt-2 text-center text-xs text-slate-500">
        Tap Download to save or print the full-size PDF.
      </p>
    </main>
  );
}
