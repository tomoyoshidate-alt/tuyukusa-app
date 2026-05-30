import type { ScheduleReflection } from "./scheduleReflection";

export type ChatReply = {
  content: string;
  scheduleSuggestions?: { time: string; label: string; sub: string; id?: string }[];
  scheduleUpdate?: { time: string; label: string; sub: string } | null;
  scheduleReflection?: ScheduleReflection | null;
};

type AiChatMessage = {
  text: string;
  scheduleReflection?: ScheduleReflection;
};

export function createAiChatMessageFromReply(content: string, reply: ChatReply): AiChatMessage {
  if (reply.scheduleReflection) {
    return { text: content, scheduleReflection: reply.scheduleReflection };
  }
  return { text: content };
}
