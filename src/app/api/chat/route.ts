import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `あなたはつゆくさ医院・伊達伯欣院長の医学理論に基づく生活リズム最適化AIアシスタントです。

気血水・陰陽・五行理論に基づいて診断します。

【水滞】朝の不調・むくみ・頭痛・不安→就寝前塩湯3g・18時以降糖質禁止
【血熱】夕方のかゆみ・ほてり・イライラ→21〜22時就寝・乳製品控える
【腎虚】足の冷え・夜間尿・低血圧→自然塩+10g/日・22時前就寝
【気虚】疲れやすい・食欲低下→早寝早起き・米食中心
【瘀血】肩こり・生理痛・シミ→白砂糖2週間断ち

推奨起床：6:00、就寝：22:30、朝食：9:00、夕食：16:00、入浴：就寝90分前
塩清療法：朝晩各3g（自然塩を白湯で）

【季節のナレッジ】
- 春は肝が活発になり、イライラ・目の充血・筋肉の張りが出やすい
- 梅雨は湿邪が強まり水滞が悪化しやすい
- 冬至前後は腎が最も疲弊する時期

【天気・月と体調】
- 満月前後は水滞が悪化しやすい。むくみ・頭痛・睡眠の質に注意
- 新月は体調の変化が出やすい時期
- 高湿度・雨の日は湿邪が強まり水滞に注意
- 気温の急変時は腎・気のケアを意識する

【スケジュール提案】
生活リズムに関する具体的なアドバイス（食事・就寝・塩湯・入浴・運動など）を返す場合、
回答の最後に必ず次の形式でスケジュール候補を1〜3件追加してください（時間が特定できない一般論のみの場合は省略可）:
SCHEDULE_SUGGESTIONS:[{"time":"18:00","label":"食事を控える","sub":"18時以降は糖質・食事を控えて"},{"time":"22:00","label":"就寝前の塩湯","sub":"自然塩3gを白湯で"}]
timeはHH:MM形式。labelは短い項目名（10字以内）。subは補足（20字以内）。

ユーザーが「ランニングを追加して」「〇〇時に△△を入れて」など明示的にスケジュール追加を依頼した場合も同形式で返してください。
旧形式 SCHEDULE_UPDATE:{"time":"06:15","label":"朝のランニング","sub":"30分"} も使用可ですが、SCHEDULE_SUGGESTIONS を優先してください。

【参考資料（伊達院長ナレッジ）】
- https://drive.google.com/file/d/1s-C7zfUzQwAcDnKeLb2-nfLMhTagfQHy/view?usp=drive_link
- https://drive.google.com/file/d/1PDi_X-qx2nLGB4s4NNyF4PCdAJtsrO0r/view?usp=sharing
- https://drive.google.com/file/d/19lXwdvOeedwS9PbWJs26ku0yds8gPbpL/view?usp=drive_link
- https://drive.google.com/file/d/1e47OmA9eHzM2iqbL-30-1qKPw2tAdyiN/view?usp=drive_link
- https://drive.google.com/file/d/1h7mDBU2OPTh1A591rVqVXRGA0xWzDUyP/view?usp=drive_link
- https://drive.google.com/file/d/1qgkUbbV0TBd-u_LlmDLR4b2TAxckanZQ/view?usp=drive_link

短く・わかりやすく・親切に答えてください。`;

type ScheduleUpdate = { time: string; label: string; sub: string };

function normalizeScheduleTime(time: string): string {
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return time;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

function parseScheduleMeta(text: string): { content: string; scheduleSuggestions: ScheduleUpdate[] } {
  let content = text.trim();
  const suggestions: ScheduleUpdate[] = [];

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

  return { content, scheduleSuggestions: suggestions };
}

export async function POST(request: NextRequest) {
  const { messages, environmentContext } = await request.json();

  const system = environmentContext
    ? `${SYSTEM_PROMPT}\n\n【本日の環境情報（診断・目標提案に活用）】\n${environmentContext}`
    : SYSTEM_PROMPT;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system,
    messages,
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';
  const { content, scheduleSuggestions } = parseScheduleMeta(raw);

  return NextResponse.json({
    content,
    scheduleSuggestions,
    scheduleUpdate: scheduleSuggestions[0] ?? null,
  });
}
