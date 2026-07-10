import { NextRequest, NextResponse } from "next/server";
import { sendPush } from "@/src/lib/push/server";

export const runtime = "nodejs";

// Vercel Cron から1日1回呼ばれる無料の朝リマインド。
// AI は呼ばず固定メッセージを日替わりで送るためAPI費用ゼロ。
// Vercel は CRON_SECRET 設定時に Authorization: Bearer <CRON_SECRET> を自動付与する。
const MORNING_MESSAGES = [
  "おはようございます。今朝は塩湯を一杯、朝の光をゆっくり浴びて。",
  "おはようございます。朝のむくみや頭が重い日は、水分の巡りを整える一日を。",
  "おはようございます。今日も無理のない起床から。温かい朝食を少しずつ。",
  "おはようございます。眠りが整うと血圧も落ち着きます。今日は早めの夕食を。",
];

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const idx = new Date().getUTCDate() % MORNING_MESSAGES.length;
  const r = await sendPush({ title: "つゆくさ", body: MORNING_MESSAGES[idx], url: "/" });
  // 未設定でも 200 を返し、Cron のエラー通知を出さない
  if (!r.configured) {
    return NextResponse.json({ ok: false, reason: "not configured" });
  }
  return NextResponse.json({ ok: true, ...r });
}
