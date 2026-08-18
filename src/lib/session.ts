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
  if (!opts?.skipPasswordGate) {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { mustChangePassword: true },
    });
    if (me?.mustChangePassword) redirect("/change-password");
  }
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
