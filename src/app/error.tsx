"use client";

import { useEffect, useState } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <div className="text-4xl">😵‍💫</div>
      <h1 className="mt-3 font-display text-2xl font-bold">Well, that didn&apos;t work</h1>
      <p className="mt-2 text-sm text-slate-600">
        Something hiccupped. Give it another shot — if it keeps happening, refresh the page.
      </p>
      <div className="mt-5 flex gap-2">
        <button onClick={reset} className="btn-primary">Try again</button>
        <a href="/" className="btn-secondary">Go home</a>
      </div>

      {/* Keeps the friendly face, but the real reason is one tap away so it can
          be read out to whoever is fixing it instead of being lost. */}
      <button
        onClick={() => setShow((v) => !v)}
        className="mt-8 text-xs text-slate-400 underline"
      >
        {show ? "Hide" : "Show"} technical details
      </button>
      {show && (
        <pre className="mt-3 w-full overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-100 p-3 text-left text-xs text-slate-700">
          {error?.message || "No message"}
          {error?.digest ? `\n\ndigest: ${error.digest}` : ""}
          {error?.stack ? `\n\n${error.stack}` : ""}
        </pre>
      )}
    </main>
  );
}
