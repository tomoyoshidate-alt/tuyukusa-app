import type { AiMemory, ExtractedMemoryCandidate, MemoryCurationDecision } from "./types";

const CURATE_SYSTEM = `あなたはメモリ整理のアシスタントです。
新しいメモリ候補と、同カテゴリの既存メモリを比較し、各候補に対する処理をJSON配列のみで返してください。

action:
- "new": 新規保存
- "duplicate": 既存と同義・重複のため破棄
- "update": 既存行を更新（内容が進化・上書きされた場合）。existingId と content を指定

ルール:
- 同じ事実の言い換えは duplicate
- 「最近は〜できるようになった」など既存の更新は update
- 明確に新しい事実は new

JSON形式:
[{"index":0,"action":"new"},{"index":1,"action":"duplicate"},{"index":2,"action":"update","existingId":"uuid","content":"更新後の文"}]

JSON配列以外は出力しない。`;

function parseJsonArray(raw: string): unknown[] {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  const start = jsonText.indexOf("[");
  const end = jsonText.lastIndexOf("]");
  if (start < 0 || end < 0) return [];
  return JSON.parse(jsonText.slice(start, end + 1)) as unknown[];
}

export function parseCurationDecisions(raw: string, candidateCount: number): MemoryCurationDecision[] {
  try {
    const arr = parseJsonArray(raw);
    const decisions: MemoryCurationDecision[] = [];
    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      const d = item as Record<string, unknown>;
      const index = typeof d.index === "number" ? d.index : -1;
      const action = d.action;
      if (index < 0 || index >= candidateCount) continue;
      if (action !== "new" && action !== "duplicate" && action !== "update") continue;
      decisions.push({
        index,
        action,
        existingId: typeof d.existingId === "string" ? d.existingId : undefined,
        content: typeof d.content === "string" ? d.content.trim() : undefined,
      });
    }
    return decisions;
  } catch {
    return [];
  }
}

export function buildCurationPrompt(
  candidates: ExtractedMemoryCandidate[],
  existingByCategory: Record<string, AiMemory[]>
): string {
  const candidateLines = candidates.map(
    (c, i) => `[${i}] category=${c.category} confidence=${c.confidence}\n${c.content}`
  );

  const existingLines: string[] = [];
  for (const [category, items] of Object.entries(existingByCategory)) {
    if (!items.length) continue;
    existingLines.push(`## ${category}`);
    for (const m of items) {
      existingLines.push(`- id=${m.id}: ${m.content}`);
    }
  }

  return [
    "【新規候補】",
    candidateLines.join("\n\n"),
    "",
    "【既存メモリ（カテゴリ別）】",
    existingLines.length ? existingLines.join("\n") : "（なし）",
  ].join("\n");
}

export function applyCurationDecisions(
  candidates: ExtractedMemoryCandidate[],
  decisions: MemoryCurationDecision[],
  existingMemories: AiMemory[],
  userId: string,
  sourceModuleId: string,
  now: string
): AiMemory[] {
  const byId = new Map(existingMemories.map(m => [m.id, m]));
  const decisionByIndex = new Map(decisions.map(d => [d.index, d]));

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const decision = decisionByIndex.get(i) ?? { index: i, action: "new" as const };

    if (decision.action === "duplicate") continue;

    if (decision.action === "update" && decision.existingId && byId.has(decision.existingId)) {
      const prev = byId.get(decision.existingId)!;
      byId.set(decision.existingId, {
        ...prev,
        content: decision.content?.trim() || candidate.content,
        confidence: Math.max(prev.confidence, candidate.confidence),
        sourceModuleId,
        updatedAt: now,
      });
      continue;
    }

    if (decision.action === "new") {
      const id = crypto.randomUUID();
      byId.set(id, {
        id,
        userId,
        content: candidate.content,
        category: candidate.category,
        confidence: candidate.confidence,
        sourceModuleId,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return Array.from(byId.values());
}

export { CURATE_SYSTEM };
