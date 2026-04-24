type Vendor = {
  atLabFest?: boolean | null;
  atLOTM?: boolean | null;
  isLunchSponsor?: boolean | null;
};

/** Small tags that appear next to a vendor name indicating sponsorships/events.
 *  Order: LabFest → LOTM → Lunch Sponsor. */
export function VendorPills({
  vendor,
  omit,
  size = "sm",
}: {
  vendor: Vendor;
  /** Events to hide — useful on event-specific pages so we don't repeat the page context. */
  omit?: Array<"labfest" | "lotm" | "lunch">;
  size?: "sm" | "md";
}) {
  const hidden = new Set(omit ?? []);
  const cls =
    size === "md"
      ? "text-[11px] px-2 py-0.5"
      : "text-[10px] px-1.5 py-0.5";
  return (
    <>
      {vendor.atLabFest && !hidden.has("labfest") && (
        <span
          className={`rounded-full bg-[#0F172A] text-white ${cls} font-bold uppercase tracking-wider`}
        >
          LabFest
        </span>
      )}
      {vendor.atLOTM && !hidden.has("lotm") && (
        <span
          className={`rounded-full bg-[#FF5DA2] text-white ${cls} font-bold uppercase tracking-wider`}
        >
          LOTM
        </span>
      )}
      {vendor.isLunchSponsor && !hidden.has("lunch") && (
        <span
          className={`rounded-full bg-[#F5A547] text-slate-900 ${cls} font-bold uppercase tracking-wider`}
        >
          Lunch Sponsor
        </span>
      )}
    </>
  );
}
