// Refuses to deploy from a copy that is behind GitHub.
//
// `vercel --prod` uploads whatever is on this disk. It does not read GitHub. So
// deploying from a stale checkout silently republishes an older version of the
// whole site and reverts anything pushed since, with no warning and nothing in
// the build log to show it. That has happened twice: once on 2026-08-18 from a
// checkout 30 commits behind, and again on 2026-10-09, which put the previous
// day's agenda fixes and bus times back to their old values for a couple of
// minutes.
//
// Run by `npm run deploy` before vercel, so the same mistake becomes an error
// message rather than a live rollback nobody notices.
//
// git is invoked with an argument array and no shell, so a branch name cannot
// be read as a command.
import { execFileSync } from "node:child_process";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const say = (s) => console.log(s);

try {
  git("rev-parse", "--is-inside-work-tree");
} catch {
  say("[predeploy] not a git checkout, skipping the staleness check");
  process.exit(0);
}

const branch = git("rev-parse", "--abbrev-ref", "HEAD");

try {
  git("fetch", "origin", "--quiet");
} catch {
  // Offline or no access. Better to say so loudly and let the person decide
  // than to block a deploy they may urgently need.
  say("[predeploy] WARNING: could not reach GitHub, so I cannot tell whether this copy is current.");
  say("[predeploy] Deploying anyway. If someone has pushed since you last pulled, this will revert them.");
  process.exit(0);
}

let behind = "0";
let ahead = "0";
try {
  [behind, ahead] = git(
    "rev-list", "--left-right", "--count", `origin/${branch}...HEAD`
  ).split(/\s+/);
} catch {
  say(`[predeploy] no origin/${branch} to compare against, skipping the staleness check`);
  process.exit(0);
}

if (Number(behind) > 0) {
  const missing = git("log", "--oneline", `HEAD..origin/${branch}`);
  say("");
  say(`[predeploy] STOPPING. This copy is ${behind} commit(s) behind origin/${branch}.`);
  say("");
  say("Deploying now would put the live site back to an older version and undo these:");
  say("");
  for (const line of missing.split("\n")) say(`    ${line}`);
  say("");
  say("Bring them in first, then deploy:");
  say("");
  say("    git pull --no-rebase");
  say("");
  process.exit(1);
}

const dirty = git("status", "--porcelain");
if (dirty) {
  // Not a reason to stop. Deploying work in progress is normal and often the
  // point. Just make sure it was not an accident.
  const count = dirty.split("\n").length;
  say(`[predeploy] note: ${count} uncommitted change(s) will be deployed, and are not on GitHub.`);
}

say(`[predeploy] up to date with origin/${branch}${Number(ahead) ? `, ${ahead} commit(s) ahead` : ""}. Deploying.`);
