# Nowak Dental Trade Show PWA

Progressive Web App for the Nowak Dental Supplies annual trade show (October 2026). Attendees install to their phone home screen — no app store. Features a vendor directory, full schedule, a QR passport game, vendor lead capture, and push notifications.

## Tech

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- PostgreSQL (Neon) + Prisma
- NextAuth (credentials)
- Web Push (VAPID) for notifications — no Firebase
- `html5-qrcode` (scanning) + `qrcode` (generating)

## First-time setup

```bash
# 1. Create a Neon database (neon.tech) and copy connection string
# 2. Copy env template
cp .env.example .env

# 3. Generate auth secret (paste into .env as NEXTAUTH_SECRET)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 4. Generate VAPID keys for push (paste into .env)
npm run gen:vapid

# 5. Install deps and push schema
npm install
npm run db:push

# 6. Seed database (creates admin, sample vendors, sessions)
npm run db:seed

# 7. Run
npm run dev
```

### Default seed accounts
- **Admin:** brandi@nowakdental.com / `changeme-admin`
- **Vendor:** vendor@example.com / `changeme-vendor`
- **Attendee:** attendee@example.com / `changeme-attendee`

**Change these passwords before going live.**

## App structure

| Route | Who | What |
|---|---|---|
| `/` | everyone | Home tiles + announcements + passport progress |
| `/login`, `/register` | public | Sign in / self-register as attendee |
| `/vendors` | everyone | Vendor directory with search & category filter |
| `/vendors/[id]` | everyone | Vendor detail + booth QR (admin/owner only) |
| `/schedule` | everyone | Schedule grouped by day |
| `/schedule/[id]` | everyone | Session detail + add-to-agenda |
| `/agenda` | everyone | Personal favorited sessions |
| `/scan` | attendee | Scan a booth QR to earn a stamp |
| `/badge` | attendee | Personal QR badge for vendors to scan |
| `/game` | attendee | Passport progress, stamps grid, leaderboard |
| `/vendor/scan` | vendor | Scan an attendee badge to capture a lead |
| `/vendor/leads` | vendor | Lead list + CSV export |
| `/admin` | admin | Dashboard: stats + top booths |
| `/admin/vendors` | admin | CRUD vendors + print booth QR |
| `/admin/schedule` | admin | CRUD sessions |
| `/admin/announcements` | admin | Send push notifications |
| `/admin/drawing` | admin | Prize drawing (random pick from eligible attendees) |
| `/admin/users` | admin | List users |
| `/admin/leads` | admin | Lead counts per vendor |

## Passport game

- Each `Vendor` has a private `boothToken` (UUID). Admin prints the QR code (from the vendor edit page) and posts it at the booth.
- Attendee scans it from `/scan` → one `BoothScan` row per attendee/vendor pair (duplicate scans show "already stamped").
- Eligibility threshold for the prize drawing is 20 booths (see `src/app/game/page.tsx` constant `WIN_THRESHOLD`).

## Lead capture

- Each `User` has a `badgeToken` (UUID) shown as QR on `/badge`.
- Vendor account owners scan attendees from `/vendor/scan` → creates a `Lead` row with the attendee's contact info.
- Export CSV from `/vendor/leads`.

## Push notifications

- Web Push (VAPID). iOS requires "Add to Home Screen" first; Android works immediately.
- First login prompts for permission (see `PushPrompt` on home page).
- Admin sends blasts from `/admin/announcements` — to everyone, attendees only, or vendors only.

## Deploy to Vercel

```bash
git init
git add .
git commit -m "Initial commit"
# Create repo on GitHub, then:
git remote add origin https://github.com/<you>/nowak-tradeshow-app.git
git push -u origin main

npm install -g vercel
vercel --prod
```

Add these environment variables in Vercel (Settings → Environment Variables):

| Key | Value |
|---|---|
| `DATABASE_URL` | Neon connection string (include `?sslmode=require`) |
| `NEXTAUTH_SECRET` | from `openssl rand -base64 32` |
| `NEXTAUTH_URL` | production URL (e.g. `https://nowakshow.vercel.app`) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | from `npm run gen:vapid` |
| `VAPID_PRIVATE_KEY` | from `npm run gen:vapid` |
| `VAPID_SUBJECT` | `mailto:brandi@nowakdental.com` |

After deploy, run once from your local machine against the prod DB:

```bash
DATABASE_URL="<prod-url>" npm run db:push
DATABASE_URL="<prod-url>" npm run db:seed
```

## Branding

- Brand color is `#0057A3` (in `globals.css`, `manifest.json`, `layout.tsx`). Swap this to Nowak's exact blue whenever confirmed.
- Logo is an SVG placeholder at `public/icon.svg`. Replace it with the Nowak logo and regenerate PNGs:
  ```bash
  npm run gen:icons
  ```
