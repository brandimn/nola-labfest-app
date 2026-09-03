"use client";

import { Printer } from "lucide-react";

/** A real client side click handler. The previous version wired window.print()
 *  through an injected <script>, which Next does not execute when you navigate
 *  to the page from inside the app, so the button quietly did nothing. */
export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-primary inline-flex items-center gap-2"
    >
      <Printer className="h-4 w-4" /> {label}
    </button>
  );
}
