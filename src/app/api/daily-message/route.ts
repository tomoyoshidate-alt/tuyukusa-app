import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getDailyMessageSystemPrompt } from "@/src/lib/i18n/prompts";
import { isAppLocale } from "@/src/lib/i18n/detectLocale";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  const { displayName, environmentContext, healthContext, userKnowledgeContext, locale } =
    await request.json();
  const appLocale = typeof locale === "string" && isAppLocale(locale) ? locale : "ja";

  let system = getDailyMessageSystemPrompt(appLocale);
  if (userKnowledgeContext) {
    system += `\n\n【ユーザーについて】\n${userKnowledgeContext}`;
  }
  if (environmentContext) {
    system += `\n\n【本日の環境】\n${environmentContext}`;
  }
  if (healthContext) {
    system += `\n\n${healthContext}`;
  }

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 180,
      system,
      messages: [
        {
          role: "user",
          content: `ユーザー名: ${displayName || "あなた"}\n本日の「つゆくさAIからのひとこと」を1つ生成してください。`,
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const tagMatch = raw.match(/【(.+?)】/);
    const tag = tagMatch?.[1]?.trim();
    const message = raw.replace(/【.+?】/, "").trim() || raw.trim();

    return NextResponse.json({ message, tag: tag ?? undefined });
  } catch {
    return NextResponse.json(
      { error: "Daily message generation failed" },
      { status: 502 }
    );
  }
}
