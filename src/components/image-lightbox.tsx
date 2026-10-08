"use client";

import { useState } from "react";
import { X } from "lucide-react";

// Tap an image to open it full-screen in an overlay with a close button.
// Stays inside the app (no navigation), so there is always a way back even in
// the installed PWA.
export function ImageLightbox({
  src,
  alt = "",
  thumbClassName,
}: {
  src: string;
  alt?: string;
  thumbClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={thumbClassName}
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
      />
      {open && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-black/90"
          onClick={() => setOpen(false)}
        >
          <div className="flex justify-end p-3">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded-full bg-white/15 p-2 text-white backdrop-blur hover:bg-white/25"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex-1 overflow-auto px-2 pb-6">
            <img
              src={src}
              alt={alt}
              className="mx-auto h-auto w-full max-w-3xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}
