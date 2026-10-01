import type { Prisma } from "@prisma/client";

type Viewer = { id: string; role: string };

// A restricted session (e.g. Jude's invitation-only masterclass) is hidden from
// everyone except the people on its allow list. Admins always see everything.
export function sessionVisibilityWhere(user: Viewer): Prisma.SessionWhereInput {
  if (user.role === "ADMIN") return {};
  return {
    OR: [{ restricted: false }, { allowedUserIds: { has: user.id } }],
  };
}

export function canSeeSession(
  user: Viewer,
  s: { restricted: boolean; allowedUserIds: string[] }
): boolean {
  return user.role === "ADMIN" || !s.restricted || s.allowedUserIds.includes(user.id);
}
