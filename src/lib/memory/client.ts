"use client";

import {
  canExtractNow,
  getMemoryUserId,
  loadAllMemories,
  loadLastExtractAt,
  replaceAllMemories,
  saveLastExtractAt,
} from "@/src/lib/memory/storage";
import type { ConversationTurn } from "@/src/lib/memory/extract";

type ChatMessageLike = {
  type: string;
  text: string;
};

const MAX_TURNS = 10;

function toConversationTurns(messages: ChatMessageLike[]): ConversationTurn[] {
  return messages
    .filter(m => m.text && m.text !== "[画像]" && (m.type === "user" || m.type === "ai"))
    .slice(-MAX_TURNS * 2)
    .map(m => ({
      role: m.type === "user" ? ("user" as const) : ("assistant" as const),
      content: m.text,
    }));
}

/** Fire-and-forget after AI tab response — does not block the chat UI. */
export function triggerMemoryExtraction(
  messages: ChatMessageLike[],
  moduleId: string,
  chatFlowStep: string
): void {
  if (chatFlowStep !== "free") return;
  if (!canExtractNow()) return;

  const turns = toConversationTurns(messages);
  if (turns.length < 2) return;

  void fetch("/api/memories/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: getMemoryUserId(),
      moduleId,
      messages: turns,
      existingMemories: loadAllMemories(),
      lastExtractAt: loadLastExtractAt(),
    }),
  })
    .then(async res => {
      if (!res.ok) return;
      const data = (await res.json()) as {
        skipped?: boolean;
        memories?: unknown;
        lastExtractAt?: string;
      };
      if (data.skipped) return;
      if (Array.isArray(data.memories)) {
        replaceAllMemories(data.memories as Parameters<typeof replaceAllMemories>[0]);
      }
      if (data.lastExtractAt) saveLastExtractAt(data.lastExtractAt);
    })
    .catch(() => {
      /* non-blocking */
    });
}

export { loadMemoriesForPrompt } from "@/src/lib/memory/storage";
