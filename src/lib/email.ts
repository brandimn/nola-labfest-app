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
      <p style="margin: 18px 0 0; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; font-weight: 600;">October 10–11, 2026 · New Orleans</p>
    </div>

    <div style="padding: 28px;">
      <h2 style="margin: 0 0 8px; font-family: Georgia, serif; font-size: 22px;">Welcome, ${escapeHtml(firstName)}</h2>
      <p style="margin: 0; font-size: 15px; line-height: 1.5; color: #334155;">
        Your spot is confirmed. The NOLA LabFest app is where you'll find the full schedule, speaker bios, vendor directory, your personal QR badge, and the booth-scanning passport game.
      </p>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${appUrl}" style="display:inline-block; background:#0F172A; color:#fff; text-decoration:none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px;">Open the NOLA LabFest app →</a>
      </div>

      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding: 16px 20px;">
        <p style="margin:0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #64748b; font-weight: 600;">Your sign-in</p>
        <div style="font-family: 'SFMono-Regular', 'Courier New', monospace; font-size: 14px; line-height: 1.7;">
          <div><span style="color:#64748b;">Email:</span> <strong style="color:#0F172A;">${escapeHtml(to)}</strong></div>
          <div><span style="color:#64748b;">Password:</span> <strong style="color:#0F172A;">${escapeHtml(password)}</strong></div>
        </div>
      </div>

      <h3 style="margin: 28px 0 8px; font-family: Georgia, serif; font-size: 18px;">Save it to your phone (takes 10 seconds)</h3>
      <p style="margin: 0 0 16px; color: #475569; font-size: 14px; line-height: 1.5;">
        The app installs to your home screen like any other app — no App Store, no downloads. You'll open it with a tap, and it works offline during the event.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 8px 0 0; border-collapse: separate; border-spacing: 12px 0;">
        <tr>
          <td valign="top" style="background: #fff; border:1px solid #e2e8f0; border-radius: 12px; padding: 16px; width: 50%;">
            <p style="margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #B13E7D; font-weight: 700;">iPhone · Safari</p>
            <ol style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.6; color: #0F172A;">
              <li>Open the app in <strong>Safari</strong>.</li>
              <li>Tap the <strong>Share</strong> icon <span style="display:inline-block; border:1px solid #cbd5e1; border-radius:4px; padding: 0 5px; font-size: 11px;">⬆︎</span> at the bottom.</li>
              <li>Scroll and tap <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Add</strong>.</li>
            </ol>
          </td>
          <td valign="top" style="background: #fff; border:1px solid #e2e8f0; border-radius: 12px; padding: 16px; width: 50%;">
            <p style="margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #F5A547; font-weight: 700;">Android · Chrome</p>
            <ol style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.6; color: #0F172A;">
              <li>Open the app in <strong>Chrome</strong>.</li>
              <li>Tap the <strong>⋮ menu</strong> in the top right.</li>
              <li>Tap <strong>Install app</strong> (or <strong>Add to Home screen</strong>).</li>
              <li>Tap <strong>Install</strong>.</li>
            </ol>
          </td>
        </tr>
      </table>

      <p style="margin: 20px 0 0; font-size: 12px; color: #94a3b8;">
        Once installed, a NOLA LabFest icon shows up next to your other apps. Tap it to get right in — your login is saved.
      </p>
    </div>

    <div style="padding: 18px 28px; background:#f8fafc; border-top:1px solid #e2e8f0; font-size:12px; color:#94a3b8; text-align: center;">
      Questions? Just reply to this email.
    </div>
  </div>
</div>`.trim();

  const text = `You're invited to NOLA LabFest — A Lab Innovation Summit
October 10–11, 2026 · New Orleans

Welcome, ${firstName}.

Your spot is confirmed. The NOLA LabFest app has the full schedule, speaker bios, vendor directory, your personal QR badge, and the booth-scanning passport game.

Open the app: ${appUrl}

Your sign-in:
  Email: ${to}
  Password: ${password}

SAVE IT TO YOUR PHONE (10 seconds, no App Store)

iPhone (Safari):
  1. Open the app in Safari
  2. Tap the Share icon at the bottom
  3. Tap "Add to Home Screen"
  4. Tap "Add"

Android (Chrome):
  1. Open the app in Chrome
  2. Tap the ⋮ menu (top right)
  3. Tap "Install app" (or "Add to Home screen")
  4. Tap "Install"

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
