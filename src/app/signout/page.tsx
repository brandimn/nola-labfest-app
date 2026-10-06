import { redirect } from "next/navigation";

// A short address that is easy to read out loud when someone is locked out and
// cannot reach the sign out button on My Account.
export default function SignOutShortcut() {
  redirect("/api/auth/signout");
}
