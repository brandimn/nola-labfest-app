import Link from "next/link";

export function EventFilter({ current }: { current: string | undefined }) {
  const items = [
    { label: "All", value: undefined },
    { label: "LabFest", value: "labfest" },
    { label: "LOTM", value: "lotm" },
  ];
  return (
    <div className="mb-3 inline-flex rounded-full bg-slate-100 p-1 text-xs font-semibold">
      {items.map((it) => {
        const active = (current || undefined) === it.value;
        const href = it.value ? `?event=${it.value}` : "?";
        return (
          <Link
            key={it.label}
            href={href}
            scroll={false}
            className={`rounded-full px-3 py-1.5 transition ${
              active
                ? "bg-white text-[#0F172A] shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}
