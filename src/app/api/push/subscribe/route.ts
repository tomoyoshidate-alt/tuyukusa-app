import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Push 購読情報を保存する。
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定なら 501（機能無効）を返し、
// 既存動作に影響を与えない。
export async function POST(request: NextRequest) {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "push not configured" }, { status: 501 });
  }

  let body: {
    client_id?: string;
    endpoint?: string;
    p256dh?: string;
    auth?: string;
    user_agent?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { client_id, endpoint, p256dh, auth, user_agent } = body;
  if (!client_id || !endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { client_id, endpoint, p256dh, auth, user_agent, updated_at: new Date().toISOString() },
      { onConflict: "endpoint" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
