"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="btn-secondary inline-flex items-center gap-1 text-sm"
        title="Sign out"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    );
  }
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="btn-secondary w-full"
    >
      Sign out
    </button>
  );
}
