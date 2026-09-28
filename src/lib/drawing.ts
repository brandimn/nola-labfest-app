// Prize drawing settings.
// Eligibility: an attendee must have visited at least `threshold` booths.
// By default that's 90% of the booth count (rounded up), but an admin can
// override the exact number on the drawing page (setting key: drawingThreshold).
export const DRAWING_PCT = 0.9;
export const DRAWING_WINNERS = 3;

export function defaultThreshold(totalVendors: number): number {
  return Math.max(1, Math.ceil(totalVendors * DRAWING_PCT));
}

export function resolveThreshold(
  totalVendors: number,
  override?: string | number | null
): number {
  const n = typeof override === "string" ? parseInt(override, 10) : override;
  if (n && Number.isFinite(n) && n > 0) return n;
  return defaultThreshold(totalVendors);
}
