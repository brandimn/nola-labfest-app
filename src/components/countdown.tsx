"use client";

import { useEffect, useState } from "react";

export function Countdown({ iso }: { iso: string }) {
  const target = new Date(iso).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = target - now;

  if (diff <= 0) {
    return (
      <span className="font-display text-2xl font-bold">
        The festival is live!
      </span>
    );
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  const secs = Math.floor((diff / 1000) % 60);

  const units: Array<[number, string]> =
    days > 1
      ? [
          [days, "days"],
          [hours, "hrs"],
          [mins, "min"],
        ]
      : [
          [days, "d"],
          [hours, "h"],
          [mins, "m"],
          [secs, "s"],
        ];

  return (
    <div className="flex items-baseline gap-3">
      {units.map(([value, label]) => (
        <div key={label} className="flex items-baseline gap-1">
          <span className="font-display text-3xl font-bold tabular-nums">{value}</span>
          <span className="text-xs uppercase tracking-wider opacity-80">{label}</span>
        </div>
      ))}
    </div>
  );
}
