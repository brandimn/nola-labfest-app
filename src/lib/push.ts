import webpush from "web-push";
import { prisma } from "@/lib/prisma";

type Role = "ATTENDEE" | "VENDOR" | "ADMIN";

let configured = false;
function configure() {
  if (configured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subj = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  if (!pub || !priv) {
    throw new Error("VAPID keys not set. Run: npx web-push generate-vapid-keys");
  }
  webpush.setVapidDetails(subj, pub, priv);
  configured = true;
}

export async function sendPush({
  title,
  body,
  url,
  targetRole,
}: {
  title: string;
  body: string;
  url?: string;
  targetRole?: Role | null;
}) {
  configure();
  const subs = await prisma.pushSubscription.findMany({
    where: targetRole ? { user: { role: targetRole } } : {},
    include: { user: { select: { role: true } } },
  });
  const payload = JSON.stringify({ title, body, url: url || "/" });
  let sent = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
        sent++;
      } catch (err: any) {
        failed++;
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        }
      }
    })
  );
  return { sent, failed, total: subs.length };
}
