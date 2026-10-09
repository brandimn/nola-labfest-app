"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Mail, CheckCircle2, Eye, Search, X } from "lucide-react";
import { InviteButton } from "@/components/invite-button";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  company: string | null;
  invited: boolean;
  opened: boolean;
  installed: boolean;
};

/** Filters as you type, because correcting somebody's details means finding
 *  them first and there are over two hundred of them. Everybody is already in
 *  the page, so this never waits on the network. */
export function UserSearchList({
  users,
  emailReady,
}: {
  users: UserRow[];
  emailReady: boolean;
}) {
  const [q, setQ] = useState("");

  // Every word has to appear somewhere across the name, address and company,
  // so "jackson mid" finds her and the order typed does not matter.
  const matches = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return users;
    return users.filter((u) => {
      const hay = `${u.name} ${u.email} ${u.company ?? ""}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [q, users]);

  return (
    <>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          autoComplete="off"
          placeholder="Search by name, email or company"
          aria-label="Search people"
          className="input w-full pl-9 pr-9"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {q && (
        <p className="mb-2 text-sm text-slate-600">
          {matches.length === 0
            ? "Nobody matches that."
            : `${matches.length} of ${users.length} ${matches.length === 1 ? "person" : "people"}`}
        </p>
      )}

      <ul className="space-y-1">
        {matches.map((u) => (
          <li key={u.id} className="card flex items-center justify-between gap-3 p-3">
            <Link href={`/admin/users/${u.id}`} className="min-w-0 flex-1 hover:opacity-80">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium">{u.name}</p>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                  {u.role}
                </span>
                {u.invited && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                    <Mail className="h-3 w-3" /> Invited
                  </span>
                )}
                {u.opened && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-800">
                    <Eye className="h-3 w-3" /> Opened
                  </span>
                )}
                {u.installed && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800">
                    <CheckCircle2 className="h-3 w-3" /> Installed
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-slate-500">
                {u.email}
                {u.company ? ` · ${u.company}` : ""}
              </p>
            </Link>
            {emailReady && <InviteButton userId={u.id} alreadyInvited={u.invited} />}
          </li>
        ))}
      </ul>
    </>
  );
}
