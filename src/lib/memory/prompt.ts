import type { AiMemory } from "./types";
import { MEMORY_CATEGORY_LABELS } from "./types";

/** Insert into module system prompt — memories persist across module switches. */
export function buildMemoriesPromptBlock(memories: AiMemory[]): string {
  if (!memories.length) return "";

  const sorted = [...memories].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const lines = sorted.map(m => {
    const label = MEMORY_CATEGORY_LABELS[m.category] ?? m.category;
    return `- [${label}] ${m.content}`;
  });

  return [
    "■ この方についてこれまでに学んだこと",
    "（専門モジュールを切り替えても引き継がれます。ユーザーが明言した事実のみ。）",
    ...lines,
  ].join("\n");
}

export function appendMemoriesToSystemPrompt(systemPrompt: string, memories: AiMemory[]): string {
  const block = buildMemoriesPromptBlock(memories);
  if (!block) return systemPrompt;
  return `${systemPrompt}\n\n${block}`;
}
