// Web Push サーバー送信の共有ロジック。
// 必須 env: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY /
//          NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY /（任意）VAPID_SUBJECT
// いずれか未設定なら configured:false を返し、呼び出し側は 501 等で無害に扱う。
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

type PushConfig = {
  supabaseUrl: string;
  serviceKey: string;
  publicKey: string;
  privateKey: string;
  subject: string;
};

export function getPushConfig(): PushConfig | null {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:tsuyukusaiin@gmail.com";
  if (!supabaseUrl || !serviceKey || !publicKey || !privateKey) return null;
  return { supabaseUrl, serviceKey, publicKey, privateKey, subject };
}

export type SendPushResult =
  | { configured: false }
  | { configured: true; sent: number; removed: number; error?: string };

export async function sendPush(opts: {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  clientId?: string;
}): Promise<SendPushResult> {
  const cfg = getPushConfig();
  if (!cfg) return { configured: false };

  webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
  const supabase = createClient(cfg.supabaseUrl, cfg.serviceKey, {
    auth: { persistSession: false },
  });

  let query = supabase.from("push_subscriptions").select("*");
  if (opts.clientId) query = query.eq("client_id", opts.clientId);
  const { data: subs, error } = await query;
  if (error) return { configured: true, sent: 0, removed: 0, error: error.message };

  const payload = JSON.stringify({
    title: opts.title,
    body: opts.body || "",
    url: opts.url || "/",
    tag: opts.tag,
  });

  let sent = 0;
  let removed = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      );
      sent++;
    } catch (e: unknown) {
      const code = (e as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        removed++;
      }
    }
  }
  return { configured: true, sent, removed };
}
