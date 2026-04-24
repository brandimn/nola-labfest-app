import { Resend } from "resend";

type InviteArgs = {
  to: string;
  name: string;
  password: string;
};

const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
const fromAddress =
  process.env.RESEND_FROM || "NOLA LabFest <onboarding@resend.dev>";

function client() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export function emailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildInviteEmail({ to, name, password }: InviteArgs) {
  const firstName = name.split(" ")[0] || name;
  const subject = "You're invited — NOLA LabFest 2026";

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background:#f8fafc; padding: 24px; color:#0F172A;">
  <div style="max-width:600px; margin: 0 auto; background:#fff; border-radius: 16px; overflow:hidden; border:1px solid #e2e8f0;">
    <div style="background: linear-gradient(135deg, #3D1E50 0%, #B13E7D 55%, #F5A547 100%); padding: 32px 28px; color:#fff;">
      <p style="margin:0; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; opacity: 0.85;">You're invited</p>
      <h1 style="margin:6px 0 0; font-family: Georgia, 'Times New Roman', serif; font-size: 34px; line-height: 1.1; font-weight: 700;">NOLA LabFest</h1>
      <p style="margin:4px 0 0; font-size: 14px; opacity: 0.9; font-style: italic;">A Lab Innovation Summit with a New Orleans twist</p>
      <p style="margin: 18px 0 0; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; font-weight: 600;">October 15–17, 2026 · New Orleans</p>
    </div>

    <div style="padding: 28px;">
      <h2 style="margin: 0 0 8px; font-family: Georgia, serif; font-size: 22px;">Welcome, ${escapeHtml(firstName)}</h2>
      <p style="margin: 0; font-size: 15px; line-height: 1.5; color: #334155;">
        Your spot is confirmed. The NOLA LabFest app has the schedule, speaker bios, vendor directory, your QR badge, and the booth-scanning passport game.
      </p>

      <div style="background: #FFF7ED; border: 1px solid #F5A547; border-radius: 12px; padding: 14px 16px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #78350F; line-height: 1.5;">
          <strong style="color:#9A3412;">📱 Don't skip ahead.</strong> Tap the button, then <strong>scroll down to install the app</strong> so you get push notifications for session reminders, announcements, and the prize drawing. It takes 10 seconds.
        </p>
      </div>

      <div style="text-align: center; margin: 20px 0 24px;">
        <a href="${appUrl}" style="display:inline-block; background:#0F172A; color:#fff; text-decoration:none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px;">Open the NOLA LabFest app →</a>
      </div>

      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding: 16px 20px;">
        <p style="margin:0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #64748b; font-weight: 600;">Your sign-in</p>
        <div style="font-family: 'SFMono-Regular', 'Courier New', monospace; font-size: 14px; line-height: 1.7;">
          <div><span style="color:#64748b;">Email:</span> <strong style="color:#0F172A;">${escapeHtml(to)}</strong></div>
          <div><span style="color:#64748b;">Password:</span> <strong style="color:#0F172A;">${escapeHtml(password)}</strong></div>
        </div>
      </div>

      <h3 style="margin: 28px 0 4px; font-family: Georgia, serif; font-size: 20px;">Install it on your phone — pick your browser</h3>
      <p style="margin: 0 0 14px; color: #475569; font-size: 14px; line-height: 1.5;">
        No App Store, no downloads — the app lives on your home screen next to everything else.
      </p>

      <!-- iPhone Safari -->
      <div style="background:#fff; border:1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 10px;">
        <p style="margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #B13E7D; font-weight: 700;">📱 iPhone — Safari</p>
        <ol style="margin: 4px 0 0; padding-left: 20px; font-size: 14px; line-height: 1.6; color: #0F172A;">
          <li>Make sure you're in <strong>Safari</strong> (not Chrome — see below if you are).</li>
          <li>Tap the <strong>Share</strong> button <span style="display:inline-block; border:1px solid #cbd5e1; border-radius:4px; padding: 0 6px; font-size: 12px;">⬆︎</span> at the bottom of the screen.</li>
          <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
          <li>Tap <strong>Add</strong> in the top right.</li>
        </ol>
      </div>

      <!-- iPhone Chrome -->
      <div style="background:#fff; border:1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 10px;">
        <p style="margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #64748b; font-weight: 700;">📱 iPhone — Chrome</p>
        <p style="margin: 4px 0 6px; font-size: 13px; color: #475569; line-height: 1.5;">
          iPhones can only install apps through Safari, not Chrome. Do this first:
        </p>
        <ol style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6; color: #0F172A;">
          <li>Tap the <strong>Share</strong> button <span style="display:inline-block; border:1px solid #cbd5e1; border-radius:4px; padding: 0 6px; font-size: 12px;">⬆︎</span> in Chrome.</li>
          <li>Choose <strong>Open in Safari</strong>.</li>
          <li>Once Safari opens, follow the iPhone · Safari steps above.</li>
        </ol>
      </div>

      <!-- Android Chrome -->
      <div style="background:#fff; border:1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 10px;">
        <p style="margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #F5A547; font-weight: 700;">📱 Android — Chrome</p>
        <ol style="margin: 4px 0 0; padding-left: 20px; font-size: 14px; line-height: 1.6; color: #0F172A;">
          <li>Open the app in <strong>Chrome</strong>.</li>
          <li>Tap the <strong>⋮ menu</strong> in the top right.</li>
          <li>Tap <strong>Install app</strong> (or <strong>Add to Home screen</strong>).</li>
          <li>Tap <strong>Install</strong>.</li>
        </ol>
      </div>

      <!-- Desktop -->
      <div style="background:#fff; border:1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 10px;">
        <p style="margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #0E8C4B; font-weight: 700;">💻 Computer — Chrome or Edge</p>
        <ol style="margin: 4px 0 0; padding-left: 20px; font-size: 14px; line-height: 1.6; color: #0F172A;">
          <li>Open the app in <strong>Chrome</strong> or <strong>Edge</strong>.</li>
          <li>Look for the <strong>install icon</strong> <span style="display:inline-block; border:1px solid #cbd5e1; border-radius:4px; padding: 0 6px; font-size: 12px;">⊕</span> on the right side of the address bar — or open the browser menu and choose <strong>Install NOLA LabFest</strong>.</li>
          <li>Click <strong>Install</strong>.</li>
        </ol>
      </div>

      <p style="margin: 16px 0 0; font-size: 13px; color: #64748b; line-height: 1.5;">
        <strong>After you install:</strong> a NOLA LabFest icon appears next to your other apps. Tap it — your login is saved, and we can send you push notifications during the event.
      </p>
    </div>

    <div style="padding: 18px 28px; background:#f8fafc; border-top:1px solid #e2e8f0; font-size:12px; color:#94a3b8; text-align: center;">
      Questions? Just reply to this email.
    </div>
  </div>
</div>`.trim();

  const text = `You're invited to NOLA LabFest — A Lab Innovation Summit
October 15–17, 2026 · New Orleans

Welcome, ${firstName}.

DON'T SKIP AHEAD: Tap the link below, then scroll down to install the app on your phone so you get push notifications for session reminders, announcements, and the prize drawing. Takes 10 seconds.

Open the app: ${appUrl}

Your sign-in:
  Email: ${to}
  Password: ${password}

INSTALL IT ON YOUR PHONE — PICK YOUR BROWSER

iPhone (Safari):
  1. Open the app in Safari (not Chrome)
  2. Tap the Share icon at the bottom
  3. Scroll down and tap "Add to Home Screen"
  4. Tap "Add"

iPhone (Chrome):
  iPhones can only install apps through Safari. First:
  1. Tap the Share icon in Chrome
  2. Choose "Open in Safari"
  3. Then follow the iPhone (Safari) steps above

Android (Chrome):
  1. Open the app in Chrome
  2. Tap the menu (⋮) in the top right
  3. Tap "Install app" (or "Add to Home screen")
  4. Tap "Install"

Computer (Chrome or Edge):
  1. Open the app in Chrome or Edge
  2. Click the install icon on the right of the address bar (or Menu → Install NOLA LabFest)
  3. Click "Install"

Questions? Reply to this email.`;

  return { subject, html, text };
}

export async function sendInviteEmail(args: InviteArgs) {
  const resend = client();
  if (!resend) {
    return { ok: false as const, reason: "RESEND_API_KEY not set" };
  }

  const { subject, html, text } = buildInviteEmail(args);

  try {
    const res = await resend.emails.send({
      from: fromAddress,
      to: args.to,
      subject,
      html,
      text,
    });
    if (res.error) return { ok: false as const, reason: res.error.message };
    return { ok: true as const, id: res.data?.id };
  } catch (e: any) {
    return { ok: false as const, reason: e.message || "send failed" };
  }
}
