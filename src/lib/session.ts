import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Role = "ATTENDEE" | "VENDOR" | "SPEAKER" | "ADMIN";

// Everyone imported from the roster starts on the shared LabFest password and
// has to pick their own before they can use the app. The check reads the
// database rather than the login token, so it clears the moment they change it.
export async function requireUser(opts?: { skipPasswordGate?: boolean }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  // A signed in token can outlive the account it points at, for example if the
  // record was merged or removed. Without this the pages render blank and the
  // sign out button is unreachable, which leaves someone locked in with no way
  // back to the login screen.
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mustChangePassword: true },
  });
  if (!me) redirect("/login?stale=1");
  if (!opts?.skipPasswordGate && me.mustChangePassword) redirect("/change-password");

  return session.user;
}

export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/");
  return user;
}

export async function getUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}
