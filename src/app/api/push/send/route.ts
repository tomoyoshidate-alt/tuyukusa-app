import { NextRequest, NextResponse } from "next/server";
import { sendPush } from "@/src/lib/push/server";

export const runtime = "nodejs";

// 手動/テスト送信。PUSH_SEND_SECRET 未設定なら 501、x-push-secret 不一致は 401。
export async function POST(request: NextRequest) {
  const sendSecret = process.env.PUSH_SEND_SECRET;
  if (!sendSecret) {
    return NextResponse.json({ error: "push not configured" }, { status: 501 });
  }
  if (request.headers.get("x-push-secret") !== sendSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { client_id?: string; title?: string; body?: string; url?: string; tag?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const r = await sendPush({
    title: body.title || "つゆくさ",
    body: body.body,
    url: body.url,
    tag: body.tag,
    clientId: body.client_id,
  });
  if (!r.configured) {
    return NextResponse.json({ error: "push not configured" }, { status: 501 });
  }
  return NextResponse.json(r);
}
