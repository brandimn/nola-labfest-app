# Nowak Dental Trade Show PWA

## Project Overview
A Progressive Web App (PWA) for the Nowak Dental Supplies trade show in October 2026. Attendees install it to their phone home screen (no app store). Supports vendor directory, schedule, push notifications, a QR passport game, and vendor lead capture.

## Business Context
- **Owner:** Nowak Dental Supplies (Brandi Nowak Dalton)
- **Event:** Annual trade show, October 2026
- **Users:** ~200 attendees (dental practice staff, reps), ~30 vendors (exhibitors), small admin team
- **Goal:** Replace paid apps like Whova with an in-house, branded experience. Drive booth traffic via gamification and give vendors an easy way to capture leads.

## Tech Stack
- **Frontend:** Next.js 14 App Router, React, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API routes / server actions
- **Database:** PostgreSQL (Neon) with Prisma ORM
- **Auth:** NextAuth.js (credentials + magic link)
- **QR:** `html5-qrcode` for scanning, `qrcode` for generating
- **Push:** Web Push API with VAPID keys (no Firebase)
- **PWA:** `next-pwa` or manual service worker + manifest
- **Hosting:** Vercel

## User Roles
1. **Attendee** — logs in, views vendors/schedule, scans booth QR codes for the passport game, displays own QR badge for vendors to scan
2. **Vendor** — logs in with a vendor account, scans attendee QR badges to collect leads, views/exports lead list, edits own booth profile
3. **Admin** — Brandi + staff. Full control: add/edit vendors, manage schedule, send push notifications, view analytics, run prize drawing

## Core Features (Build Order)

### Phase 1: Foundation (scaffold + DB + auth)
**Database schema:**
- `User` — id, email (unique), password (hashed), name, role (ATTENDEE | VENDOR | ADMIN), phone, company, title, createdAt
- `Vendor` — id, userId (FK, nullable — a User with role=VENDOR owns this), name, boothNumber, logoUrl, description, website, contactEmail, contactPhone, category, createdAt
- `Session` — id, title, description, speaker, location, startsAt, endsAt, track (string)
- `Favorite` — userId, sessionId (personal agenda)
- `BoothScan` — id, attendeeId, vendorId, scannedAt (passport game — attendee scanned a vendor's booth)
- `Lead` — id, vendorId, attendeeId, scannedAt, notes (vendor captures attendee contact)
- `PushSubscription` — id, userId, endpoint, p256dh, auth, createdAt
- `Announcement` — id, title, body, sentAt, sentById, targetRole (null = everyone)

**Auth:** NextAuth with credentials provider. Attendees self-register; vendors/admin accounts created by admin.

### Phase 2: Vendor Directory
- `/vendors` — grid of 30 vendor cards (logo, name, booth #, category)
- Search + filter by category
- `/vendors/[id]` — detail page with description, website, contact, "Scan this booth" QR (vendor's own QR for attendees)

### Phase 3: Schedule
- `/schedule` — list grouped by day, then time. Color-coded by track.
- Tap session → detail page → "Add to my agenda" (favorite)
- `/agenda` — logged-in user's favorited sessions

### Phase 4: QR Passport Game
- Every Vendor row has a QR token (UUID). Print as signs for booths.
- Attendee's app has a "Scan Booth" button → opens camera → scans QR → creates a `BoothScan`
- `/game` shows progress: "12 of 30 booths visited", grid of stamps, leaderboard (top 10 by scans)
- Hit threshold (e.g., 20 of 30) → entered in prize drawing
- Admin `/admin/drawing` — randomly pick a winner from eligible attendees

### Phase 5: Vendor Lead Capture
- Every attendee has a personal QR token (UUID) shown on `/badge`
- Vendors have a "Scan Attendee" button (only visible to role=VENDOR) → scans attendee → creates a `Lead` row with attendee's contact info
- Vendor dashboard `/vendor/leads` — list of leads, add notes, export CSV
- Prevent duplicate leads per vendor/attendee pair (upsert)

### Phase 6: Push Notifications
- Service worker handles `push` events
- User subscribes on first login (prompt for permission)
- `PushSubscription` saved to DB
- Admin `/admin/announcements` — compose + send to all / by role
- Server uses `web-push` library with VAPID keys

### Phase 7: PWA install
- `manifest.json` — name, icons (192, 512), theme color, display: standalone, start_url
- Service worker registered in layout
- "Install app" prompt banner on first visit

### Phase 8: Admin Dashboard
- `/admin` — stats: total attendees, scans today, top booths, push subscribers
- `/admin/vendors` — CRUD vendors
- `/admin/schedule` — CRUD sessions
- `/admin/users` — list users, impersonate, reset password
- `/admin/drawing` — prize drawing

## Design Guidelines
- **Brand colors:** Nowak blue (#0057A3 — confirm with Brandi), white background, clean
- **Font:** Inter or system sans
- **Mobile-first** — this is primarily used on phones at the show. Desktop should also look good.
- Big tap targets, bottom nav bar on mobile (Home / Vendors / Schedule / Scan / Me)
- Floating camera button for QR scanning
- Use shadcn/ui for all components

## Important Rules
- **Env vars only**, never hardcode secrets. `.env` for local, Vercel dashboard for prod.
- **Timezone:** America/New_York for all session times (show is in the US).
- **Error handling:** graceful toasts for scan errors (camera denied, invalid QR, already scanned).
- **Pagination defaults:** 20 per page.
- **Security:** hash passwords with bcrypt, protect all API routes with NextAuth session, role checks on admin/vendor routes.
- **QR tokens:** use UUIDs, never expose user.id in QR. Separate `badgeToken` and `boothToken` columns.
- **Duplicate scan protection:** same attendee scanning same booth → return existing row, don't error. Show "already stamped" message.
