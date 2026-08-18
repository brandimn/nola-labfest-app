"use client";

/** Pick from the categories already in use, so nobody invents "3d printing"
 *  next to "3D Printing" and splits the filter attendees rely on. */
export function CategoryPicker({
  value,
  onChange,
  options,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  options: string[];
}) {
  const custom = value.filter((c) => !options.includes(c));

  return (
    <div>
      <p className="mb-2 text-xs text-slate-500">
        Tap the ones that fit. This is how attendees filter the vendor list.
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((c) => {
          const on = value.includes(c);
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(on ? value.filter((x) => x !== c) : [...value, c])}
              className={
                on
                  ? "rounded-full bg-[#7C3AED] px-3 py-1.5 text-sm font-semibold text-white"
                  : "rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700"
              }
            >
              {on ? "✓ " : ""}{c}
            </button>
          );
        })}
      </div>

      {custom.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Not in the standard list:</span>
          {custom.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(value.filter((x) => x !== c))}
              className="rounded-full bg-slate-200 px-3 py-1.5 text-sm text-slate-700"
              title="Remove"
            >
              {c} ✕
            </button>
          ))}
        </div>
      )}

      <label className="label mt-3">Something not listed?</label>
      <input
        className="input"
        placeholder="Type a category and press Enter"
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          const v = (e.target as HTMLInputElement).value.trim();
          if (v && !value.includes(v)) onChange([...value, v]);
          (e.target as HTMLInputElement).value = "";
        }}
      />
    </div>
  );
}
