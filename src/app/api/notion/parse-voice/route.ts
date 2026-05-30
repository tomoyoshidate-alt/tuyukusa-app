import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { parseVoiceTaskJson } from "@/src/lib/notionServer";

export const dynamic = "force-dynamic";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const { transcript } = (await request.json()) as { transcript?: string };
  if (!transcript?.trim()) {
    return NextResponse.json({ error: "音声テキストがありません" }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const prompt = `あなたはタスク解析AIです。ユーザーの日本語音声入力を解析し、JSONのみを返してください。

今日の日付: ${today}

入力例:
- 「明日の14時に歯医者の予約」→ 期限付きタスク、期限=明日、時間=14:00
- 「毎朝6時に起床」→ 習慣タスク、時間=06:00
- 「今日中にレポートを書く」→ 今日のタスク、期限=今日

出力形式（JSONのみ）:
{
  "text": "タスク名（短く）",
  "type": "today" | "deadline" | "habit",
  "category": "仕事" | "健康" | "生活" | "その他",
  "deadline": "YYYY-MM-DD または null",
  "time": "HH:MM または null",
  "summary": "ユーザーへの確認用説明（1文）"
}

音声入力: ${transcript.trim()}`;

  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      });
      const text =
        message.content[0]?.type === "text" ? message.content[0].text : "";
      const parsed = parseVoiceTaskJson(text);
      if (parsed) return NextResponse.json({ task: parsed });
    }
  } catch {
    /* fallback below */
  }

  const fallback = parseVoiceTaskHeuristic(transcript.trim(), today);
  return NextResponse.json({ task: fallback });
}

function parseVoiceTaskHeuristic(transcript: string, today: string): ReturnType<typeof parseVoiceTaskJson> {
  const text = transcript.replace(/^(今日中に|明日|毎朝|毎日)/, "").trim() || transcript;
  let type: "today" | "deadline" | "habit" = "today";
  if (/毎朝|毎日|習慣/.test(transcript)) type = "habit";
  else if (/明日|\d{1,2}月\d{1,2}日|\d+\/\d+/.test(transcript)) type = "deadline";

  let deadline: string | null = today;
  if (/明日/.test(transcript)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    deadline = d.toISOString().slice(0, 10);
  } else if (type === "habit") {
    deadline = null;
  }

  const timeMatch = transcript.match(/(\d{1,2})[時:：](\d{0,2})?/);
  let time: string | null = null;
  if (timeMatch) {
    const h = timeMatch[1].padStart(2, "0");
    const m = (timeMatch[2] ?? "0").padStart(2, "0");
    time = `${h}:${m}`;
  }

  let category = "その他";
  if (/歯|病院|健康|運動|起床/.test(transcript)) category = "健康";
  if (/レポート|仕事|会議|提出/.test(transcript)) category = "仕事";

  return {
    text,
    type,
    category,
    deadline,
    time,
    summary: transcript,
  };
}
