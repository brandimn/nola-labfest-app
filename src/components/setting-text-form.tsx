"use client";

import { useState } from "react";

export function SettingTextForm({
  settingKey,
  initialValue,
  placeholder,
  buttonLabel = "Save",
}: {
  settingKey: string;
  initialValue: string;
  placeholder?: string;
  buttonLabel?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: settingKey, value }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        placeholder={placeholder}
        className="input flex-1 min-w-[200px]"
      />
      <button onClick={save} disabled={busy} className="btn-primary text-sm">
        {busy ? "Saving…" : buttonLabel}
      </button>
      {saved && <span className="text-sm font-medium text-green-700">Saved ✓</span>}
    </div>
  );
}
