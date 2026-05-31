import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { getChatSystemPrompt } from '@/src/lib/i18n/prompts';
import { isAppLocale } from '@/src/lib/i18n/detectLocale';
import { buildClaudeMessageContent } from '@/src/lib/claudeMultimodal';
import {
  parseReflectScheduleFromText,
  reflectionToScheduleUpdates,
  type ScheduleReflection,
} from '@/src/lib/scheduleReflection';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type ScheduleUpdate = { time: string; label: string; sub: string };

function normalizeScheduleTime(time: string): string {
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return time;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

function parseScheduleMeta(text: string): {
  content: string;
  scheduleSuggestions: ScheduleUpdate[];
  scheduleReflection: ScheduleReflection | null;
} {
  const { content: afterReflect, reflection } = parseReflectScheduleFromText(text);
  let content = afterReflect.trim();
  const suggestions: ScheduleUpdate[] = [];

  if (reflection) {
    for (const item of reflectionToScheduleUpdates(reflection)) {
      suggestions.push(item);
    }
    return { content, scheduleSuggestions: suggestions, scheduleReflection: reflection };
  }

  const suggestionsIdx = content.lastIndexOf("SCHEDULE_SUGGESTIONS:");
  if (suggestionsIdx >= 0) {
    const jsonPart = content.slice(suggestionsIdx + "SCHEDULE_SUGGESTIONS:".length).trim();
    try {
      const parsed = JSON.parse(jsonPart) as ScheduleUpdate[];
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item?.time && item?.label) {
            suggestions.push({
              time: normalizeScheduleTime(item.time),
              label: item.label,
              sub: item.sub ?? "",
            });
          }
        }
      }
      content = content.slice(0, suggestionsIdx).trim();
    } catch {
      /* ignore */
    }
  }

  const singleMatch = content.match(/SCHEDULE_UPDATE:(\{[^}]+\})/);
  if (singleMatch) {
    try {
      const single = JSON.parse(singleMatch[1]) as ScheduleUpdate;
      if (single.time && single.label) {
        suggestions.push({
          time: normalizeScheduleTime(single.time),
          label: single.label,
          sub: single.sub ?? "",
        });
      }
      content = content.replace(/\n?SCHEDULE_UPDATE:\{[^}]+\}/, "").trim();
    } catch {
      content = content.replace(/\n?SCHEDULE_UPDATE:\{[^}]+\}/, "").trim();
    }
  }

  return { content, scheduleSuggestions: suggestions, scheduleReflection: null };
}

type IncomingMessage = {
  role: string;
  content: string;
  images?: { mediaType: string; data: string }[];
};

export async function POST(request: NextRequest) {
  const { messages, environmentContext, userKnowledgeContext, healthContext, locale } = await request.json();
  const appLocale = typeof locale === "string" && isAppLocale(locale) ? locale : "ja";

  let system = getChatSystemPrompt(appLocale);
  if (userKnowledgeContext) {
    system += `\n\n【ユーザーについて（過去の相談から把握している情報）】\n${userKnowledgeContext}\n\n上記を踏まえ、継続性のある提案・回答をしてください。`;
  }
  if (environmentContext) {
    system += `\n\n【本日の環境情報（診断・目標提案に活用）】\n${environmentContext}`;
  }
  if (healthContext) {
    system += `\n\n${healthContext}\n\n上記のヘルスケアデータを診断・生活リズム提案に活用してください。`;
  }

  const anthropicMessages = (messages as IncomingMessage[]).map(m => ({
    role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content:
      m.role === "user" && m.images?.length
        ? buildClaudeMessageContent(String(m.content), m.images)
        : String(m.content),
  }));

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 900,
    system,
    messages: anthropicMessages,
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';
  const { content, scheduleSuggestions, scheduleReflection } = parseScheduleMeta(raw);

  return NextResponse.json({
    content,
    scheduleSuggestions,
    scheduleUpdate: scheduleSuggestions[0] ?? null,
    scheduleReflection,
  });
}
