"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <div className="text-4xl">😵‍💫</div>
      <h1 className="mt-3 font-display text-2xl font-bold">Well, that didn't work</h1>
      <p className="mt-2 text-sm text-slate-600">
        Something hiccupped. Give it another shot — if it keeps happening, refresh the page.
      </p>
      <div className="mt-5 flex gap-2">
        <button onClick={reset} className="btn-primary">Try again</button>
        <a href="/" className="btn-secondary">Go home</a>
      </div>
    </main>
  );
}
