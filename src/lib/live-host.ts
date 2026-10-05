import { cookies } from "next/headers";

const COOKIE = "labfest_host";

/** The host and setup pages sit behind a PIN from GAME_HOST_PIN. The PIN itself
 *  never reaches the browser; a signed-in marker cookie does. */
export function hostPin() {
  return process.env.GAME_HOST_PIN || "";
}

export function isHost() {
  if (!hostPin()) return false;
  return cookies().get(COOKIE)?.value === hostPin();
}

export const HOST_COOKIE = COOKIE;
