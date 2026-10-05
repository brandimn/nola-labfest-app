"use client";

import { useEffect, useState } from "react";
import { QRDisplay } from "@/components/qr-display";
import { PrintButton } from "@/components/print-button";

/** Two signs: one for the audience, one for the six on stage. Built to be
 *  projected on the lobby screen and printed for the tables. */
export default function CodesPage() {
  const [origin, setOrigin] = useState("");
  const [name, setName] = useState("LabFest Bench Talk");

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/live/state", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => d?.game?.name && setName(d.game.name))
      .catch(() => {});
  }, []);

  const cards = [
    {
      title: "Vote",
      who: "Everybody",
      url: `${origin}/live/vote`,
      blurb: "Scan this to vote. No app, no password.",
      accent: "#7C3AED",
    },
    {
      title: "Players",
      who: "The six on stage",
      url: `${origin}/live/play`,
      blurb: "Scan this, then tap your name.",
      accent: "#B13E7D",
    },
  ];

  return (
    <main className="min-h-screen bg-white px-6 py-8 text-slate-900 print:px-0 print:py-0">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <div>
            <a href="/live/setup" className="text-sm text-slate-500">← Setup</a>
            <h1 className="mt-1 font-display text-2xl font-bold">QR codes</h1>
            <p className="text-sm text-slate-600">
              Print these for the tables, or put this page on the projector during the lobby.
            </p>
          </div>
          <PrintButton label="Print QR signs" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {cards.map((c) => (
            <div
              key={c.title}
              className="qr-card flex flex-col items-center rounded-3xl border-4 p-8 text-center"
              style={{ borderColor: c.accent }}
            >
              <p className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: c.accent }}>
                {name}
              </p>
              <p className="mt-2 font-display text-5xl font-bold">{c.title}</p>
              <p className="mt-1 text-sm font-semibold uppercase tracking-wider text-slate-500">{c.who}</p>
              <div className="my-6">{origin && <QRDisplay value={c.url} size={320} />}</div>
              <p className="text-lg font-medium">{c.blurb}</p>
              <p className="mt-2 break-all font-mono text-xs text-slate-500">{c.url}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500 print:hidden">
          Big screen goes to <span className="font-mono">{origin}/live/screen</span>. Host runs from{" "}
          <span className="font-mono">{origin}/live/host</span>.
        </p>
      </div>

      <style>{`
        @media print {
          @page { size: portrait; margin: 0.4in; }
          .qr-card { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
    </main>
  );
}
