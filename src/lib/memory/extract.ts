import {
  MAX_EXTRACTED_MEMORIES,
  MEMORY_CATEGORIES,
  MIN_MEMORY_CONFIDENCE,
  type ExtractedMemoryCandidate,
  type MemoryCategory,
} from "./types";

export type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

const EXTRACT_SYSTEM = `あなたは医療カルテ作成のアシスタントです。
会話からユーザーが明言した事実のみを抽出し、JSON配列のみを返してください。

ルール:
- 医師のカルテのように客観的・簡潔に
- 憶測や診断はしない
- ユーザーが明言した事実のみ
- 最大${MAX_EXTRACTED_MEMORIES}件
- 該当なしなら空配列 []

各要素の形式:
{"content":"...", "category":"constitution|lifestyle|preference|symptom_pattern|family", "confidence":0.0〜1.0}

category:
- constitution: 体質・体の傾向
- lifestyle: 生活リズム・習慣
- preference: 好み・こだわり
- symptom_pattern: 症状の傾向（診断名ではなくユーザー述べた症状）
- family: 家族・同居環境

JSON配列以外は出力しない。`;

function isMemoryCategory(value: string): value is MemoryCategory {
  return (MEMORY_CATEGORIES as readonly string[]).includes(value);
}

function parseJsonArray(raw: string): unknown[] {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  const start = jsonText.indexOf("[");
  const end = jsonText.lastIndexOf("]");
  if (start < 0 || end < 0) return [];
  return JSON.parse(jsonText.slice(start, end + 1)) as unknown[];
}

export function parseExtractedMemories(raw: string): ExtractedMemoryCandidate[] {
  try {
    const arr = parseJsonArray(raw);
    const results: ExtractedMemoryCandidate[] = [];
    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      const d = item as Record<string, unknown>;
      const content = typeof d.content === "string" ? d.content.trim() : "";
      const category = typeof d.category === "string" ? d.category : "";
      const confidence = typeof d.confidence === "number" ? d.confidence : 0;
      if (!content || !isMemoryCategory(category)) continue;
      if (confidence < MIN_MEMORY_CONFIDENCE) continue;
      results.push({ content, category, confidence });
      if (results.length >= MAX_EXTRACTED_MEMORIES) break;
    }
    return results;
  } catch {
    return [];
  }
}

export function formatConversationForExtraction(turns: ConversationTurn[]): string {
  return turns
    .map(t => `${t.role === "user" ? "ユーザー" : "AI"}: ${t.content}`)
    .join("\n\n");
}

export { EXTRACT_SYSTEM };
