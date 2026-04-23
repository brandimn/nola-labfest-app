"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";

export function InviteButton({
  userId,
  alreadyInvited,
}: {
  userId: string;
  alreadyInvited: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function send() {
    if (
      alreadyInvited &&
      !window.confirm(
        "This attendee was already invited. Sending again will reset their password. Continue?"
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed");
      setStatus("sent");
      router.refresh();
    } catch (e: any) {
      setStatus("error");
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={send}
      disabled={busy || status === "sent"}
      className="btn-secondary text-xs inline-flex items-center gap-1"
      title={error}
    >
      <Mail className="h-3 w-3" />
      {status === "sent"
        ? "Sent"
        : busy
          ? "Sending…"
          : alreadyInvited
            ? "Resend"
            : "Invite"}
    </button>
  );
}
