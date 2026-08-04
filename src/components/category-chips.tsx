// Colorful category tags for vendors. Each category gets its own Mardi Gras hue.
const CATEGORY_COLORS: Record<string, string> = {
  "Zirconia & Ceramics": "bg-purple-100 text-purple-800 ring-purple-200",
  "Lab Materials": "bg-teal-100 text-teal-800 ring-teal-200",
  "3D Printing": "bg-pink-100 text-pink-800 ring-pink-200",
  "Milling & CAM": "bg-amber-100 text-amber-800 ring-amber-200",
  "Scanners": "bg-sky-100 text-sky-800 ring-sky-200",
  "CAD/CAM Software": "bg-indigo-100 text-indigo-800 ring-indigo-200",
  "Lab Equipment": "bg-emerald-100 text-emerald-800 ring-emerald-200",
  "Implants": "bg-rose-100 text-rose-800 ring-rose-200",
  "Denture Teeth": "bg-cyan-100 text-cyan-800 ring-cyan-200",
  "Business & Services": "bg-slate-100 text-slate-700 ring-slate-200",
  "Supplies": "bg-yellow-100 text-yellow-800 ring-yellow-200",
};

const FALLBACK = "bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200";

export function CategoryChips({
  categories,
  size = "sm",
}: {
  categories: string[];
  size?: "sm" | "md";
}) {
  if (!categories?.length) return null;
  const cls = size === "md" ? "text-xs px-2.5 py-1" : "text-[10px] px-2 py-0.5";
  return (
    <div className="flex flex-wrap gap-1">
      {categories.map((c) => (
        <span
          key={c}
          className={`rounded-full font-semibold ring-1 ring-inset ${cls} ${
            CATEGORY_COLORS[c] ?? FALLBACK
          }`}
        >
          {c}
        </span>
      ))}
    </div>
  );
}
