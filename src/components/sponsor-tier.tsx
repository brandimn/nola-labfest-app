type Tier = "PLATINUM" | "GOLD" | "SILVER" | "BRONZE";

const STYLES: Record<Tier, { bg: string; text: string; label: string }> = {
  PLATINUM: { bg: "bg-gradient-to-r from-slate-700 to-slate-900", text: "text-white", label: "Platinum" },
  GOLD: { bg: "bg-[#D4AF37]", text: "text-slate-900", label: "Gold" },
  SILVER: { bg: "bg-[#C0C0C0]", text: "text-slate-900", label: "Silver" },
  BRONZE: { bg: "bg-[#CD7F32]", text: "text-white", label: "Bronze" },
};

export function SponsorTier({ tier, size = "sm" }: { tier?: string | null; size?: "sm" | "md" }) {
  if (!tier || !(tier in STYLES)) return null;
  const s = STYLES[tier as Tier];
  const sizeCls = size === "md" ? "text-xs px-2 py-1" : "text-[10px] px-1.5 py-0.5";
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold uppercase tracking-wider ${sizeCls} ${s.bg} ${s.text}`}
    >
      {s.label}
    </span>
  );
}
