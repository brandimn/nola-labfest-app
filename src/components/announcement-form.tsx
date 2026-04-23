"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AnnouncementForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [url, setUrl] = useState("/");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");

  async function send() {
    if (!title.trim() || !body.trim()) return;
    setSending(true); setResult("");
    const res = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, targetRole: targetRole || null, url: url || "/" }),
    });
    setSending(false);
    const data = await res.json();
    if (!res.ok) { setResult(data.error || "Failed"); return; }
    setResult(`Sent to ${data.sent} device(s). ${data.failed} failed.`);
    setTitle(""); setBody("");
    router.refresh();
  }

  return (
    <div className="card p-4 space-y-3">
      <div><label className="label">Title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div><label className="label">Message</label><textarea className="input" rows={3} value={body} onChange={(e) => setBody(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Audience</label>
          <select className="input" value={targetRole} onChange={(e) => setTargetRole(e.target.value)}>
            <option value="">Everyone</option>
            <option value="ATTENDEE">Attendees only</option>
            <option value="VENDOR">Vendors only</option>
          </select>
        </div>
        <div>
          <label className="label">Open URL on tap</label>
          <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
      </div>
      <button onClick={send} disabled={sending || !title.trim() || !body.trim()} className="btn-primary">
        {sending ? "Sending…" : "Send push notification"}
      </button>
      {result && <p className="text-sm text-slate-600">{result}</p>}
    </div>
  );
}
