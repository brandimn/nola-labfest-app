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

export async function sendInviteEmail({ to, name, password }: InviteArgs) {
  const resend = client();
  if (!resend) {
    return { ok: false as const, reason: "RESEND_API_KEY not set" };
  }

  const firstName = name.split(" ")[0] || name;
  const subject = "You're invited — NOLA LabFest 2026";
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background:#f8fafc; padding: 24px;">
      <div style="max-width:560px; margin: 0 auto; background:#fff; border-radius: 16px; overflow:hidden; border:1px solid #e2e8f0;">
        <div style="height: 10px; background: linear-gradient(90deg, #3D1E50, #B13E7D, #F5A547);"></div>
        <div style="padding: 28px 28px 8px;">
          <h1 style="margin:0; font-family: Georgia, serif; font-size: 28px; color:#0F172A;">Welcome, ${escapeHtml(firstName)}</h1>
          <p style="margin:8px 0 0; font-size:14px; color:#64748b;">You're on the list for NOLA LabFest — A Lab Innovation Summit, October 10–11 in New Orleans.</p>
        </div>
        <div style="padding: 20px 28px;">
          <p style="margin: 0 0 12px; color:#0F172A;">Open the event app to see the full schedule, vendor directory, and your personal QR badge:</p>
          <p style="margin: 0 0 20px;">
            <a href="${appUrl}" style="display:inline-block; background:#0F172A; color:#fff; text-decoration:none; padding: 12px 20px; border-radius: 10px; font-weight:600;">Open the NOLA LabFest app →</a>
          </p>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding: 14px 18px; font-family: 'Courier New', monospace; font-size:14px;">
            <div><strong style="font-family: inherit;">Email:</strong> ${escapeHtml(to)}</div>
            <div><strong style="font-family: inherit;">Password:</strong> ${escapeHtml(password)}</div>
          </div>
          <p style="margin: 20px 0 0; font-size: 13px; color:#64748b;">
            <strong>Tip:</strong> After logging in on your phone, tap the browser's <em>Share</em> icon (iPhone) or <em>⋮ menu</em> (Android) and choose <em>Add to Home Screen</em>. The app will install like any other — no App Store needed.
          </p>
        </div>
        <div style="padding: 16px 28px; background:#f8fafc; border-top:1px solid #e2e8f0; font-size:12px; color:#94a3b8;">
          Questions? Reply to this email.
        </div>
      </div>
    </div>
  `;

  const text = `You're invited to NOLA LabFest — A Lab Innovation Summit, October 10–11 in New Orleans.

Open the app: ${appUrl}

Your sign-in:
  Email: ${to}
  Password: ${password}

After signing in on your phone, tap the browser's Share icon (iPhone) or menu (Android) and choose "Add to Home Screen" to install the app.`;

  try {
    const res = await resend.emails.send({
      from: fromAddress,
      to,
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

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
