# NOLA LabFest Event App

## What this is
A Progressive Web App (PWA) for the annual NOLA LabFest dental industry event hosted by Nowak Dental Supplies. Attendees install it on their phones and use it for the schedule, vendor list, speakers, and a passport game.

## Owner
Brandi Nowak Dalton, co-owner of Nowak Dental Supplies (GitHub: brandimn)

## Live URLs
- Production: https://app.nolalabfest.com (custom domain, added 2026-08-25)
- Also still works: https://nola-labfest-app.vercel.app
- GitHub repo: https://github.com/brandimn/nola-labfest-app.git

## Tech stack
- Next.js (App Router)
- Hosted on Vercel
- Database: Neon Postgres
- PWA enabled (service worker for offline support)
- Push notifications via web-push (VAPID)

## Four user types
1. **Attendee** - sees schedule, vendor list, speakers, plays the passport game
2. **Vendor** - scans attendee badges to capture leads, edits their own booth listing
3. **Speaker** - edits their own bio, photo, and LinkedIn
4. **Admin** - creates badges, manages schedule, vendors, speakers, and sends push announcements

A single login can be both a vendor and a speaker (Rob Nazzal is). Access is decided by what
they own (Vendor.userId / Speaker.userId), not by role alone.

## Target launch
October 2026 LabFest in New Orleans, ~200 attendees expected. Internal deadline: August 2026 so we have time to test.

## Brand & voice
- Friendly, warm, Southern with a New Orleans twist
- Bayou mascot characters: C.Zir the Crawfish, Gumbeaux the Gator, Ollie the Oyster, Remi the Turtle
- Avoid hyphens and em dashes in user-facing copy

## Must-have features still to build (in priority order)
1. Fix VAPID push notification keys
2. Live admin announcements that push to all user types (attendees, vendors, admins)
3. ~~Forgot password flow~~ DONE
4. Vendor notes field when scanning badges, with Hot/Warm/Cold tag
5. Vendor lead CSV export
6. Offline caching for schedule, vendor, and speaker pages (stale-while-revalidate)
7. Floor map / venue map page

## Nice to have (after must-haves)
- Vendor coupons and giveaways

## Roster import
`/admin/import-roster` loads vendors and speakers from `src/data/roster.json`, which was built
from the "APP Email Addresses " tab of the 2026 event workbook. That tab is the source of truth
for who gets a login. The "Vendor Exhibitors" tab is a prospect list and includes companies that
never signed up, so use it only to look up a name for an email already on the app tab.
Everyone starts with the shared password Labfest26 and is asked to pick their own on first login.
The import never sends email. Re-running it is safe.

## Booths with several staff
A company can send more than one person. `User.vendorId` puts them all on the same booth: they
share one lead list, all scan badges, and all can edit the listing. `Vendor.userId` still marks
the primary contact. Always look a booth up with `getMyBooth()` from `src/lib/booth.ts`, never
`vendor.findUnique({ where: { userId } })`, or staff who are not the primary contact silently
lose lead capture.

## First login
Roster-imported accounts get `mustChangePassword: true`. `requireUser()` in `src/lib/session.ts`
redirects them to `/change-password` until they pick their own. The check reads the database,
not the login token, so it clears immediately.

## There are TWO Vercel projects, only one is real
`nola-labfest-app` is the live site and holds the environment variables.
`nola-labfest-app-ka2f` is a duplicate with no DATABASE_URL. Both were connected to the same
GitHub repo, so every push built both and the duplicate failed instantly, sending Brandi a
"failed production deployment" email every time. Its GitHub connection was disconnected on
2026-08-18. Do not reconnect it, and check `npx vercel project ls` before trusting any claim
about which project is failing.

## The app address lives in NEXTAUTH_URL
It is not just the sign in redirect. Booth QR codes, attendee badge QR codes, password reset
links and invite emails all build their URLs from it. If the domain ever changes, update
NEXTAUTH_URL in the Vercel dashboard and redeploy, or printed QR codes will carry the old
address forever. It is set to https://app.nolalabfest.com.

DNS for nolalabfest.com is managed by Marybeth in Squarespace. `app` is an A record to
76.76.21.21. The marketing site nolalabfest.com is a separate Squarespace site, not ours.

## Deploys
`npm run build` runs `prisma db push`, so deploying applies schema changes to the live database.
Prisma refuses destructive changes without a flag, so additive changes are safe.

NEVER pass `--accept-data-loss`. On 2026-08-18 it was used to get one harmless unique constraint
applied, from a checkout that was 30 commits behind. It dropped TeamMember (5 rows),
GalleryPhoto (1 row), User.state (67 values), User.badgeType (69) and the Vendor and Session
columns added in those commits. Read every line of the warning list, not the first one. If a
constraint genuinely needs forcing, fetch and merge first so the schema being pushed is current.

## Working style notes
- Brandi gets one prompt at a time, test between each change
- When making changes, always tell her if env variables need to be added to Vercel dashboard separately from local .env
- Keep explanations clear and non-technical when possible.
