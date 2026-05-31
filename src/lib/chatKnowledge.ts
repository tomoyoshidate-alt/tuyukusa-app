export type LifestyleKnowledge = {
  goal?: string;
  returnHome?: string;
  dinner?: string;
  bath?: string;
  wake?: string;
};

export type ChatKnowledge = {
  goals: string[];
  lifestyle: LifestyleKnowledge;
  userNotes: string[];
  updatedAt: string;
};

export const INITIAL_CHAT_KNOWLEDGE: ChatKnowledge = {
  goals: [],
  lifestyle: {},
  userNotes: [],
  updatedAt: "",
};

export type StoredChatMessage = {
  type: string;
  text: string;
  step?: string;
  showSchedule?: boolean;
  choices?: string[];
};

const MAX_GOALS = 8;
const MAX_NOTES = 20;
const MAX_NOTE_LENGTH = 120;

function uniquePush(list: string[], value: string, max: number): string[] {
  const trimmed = value.trim();
  if (!trimmed) return list;
  const next = [trimmed, ...list.filter(item => item !== trimmed)];
  return next.slice(0, max);
}

export function normalizeChatKnowledge(data: unknown): ChatKnowledge {
  if (!data || typeof data !== "object") return INITIAL_CHAT_KNOWLEDGE;
  const d = data as Partial<ChatKnowledge & { lifestyle?: Partial<LifestyleKnowledge> }>;
  const lifestyle = d.lifestyle && typeof d.lifestyle === "object" ? d.lifestyle : {};
  return {
    goals: Array.isArray(d.goals) ? d.goals.filter(g => typeof g === "string").slice(0, MAX_GOALS) : [],
    lifestyle: {
      goal: typeof lifestyle.goal === "string" ? lifestyle.goal : undefined,
      returnHome: typeof lifestyle.returnHome === "string" ? lifestyle.returnHome : undefined,
      dinner: typeof lifestyle.dinner === "string" ? lifestyle.dinner : undefined,
      bath: typeof lifestyle.bath === "string" ? lifestyle.bath : undefined,
      wake: typeof lifestyle.wake === "string" ? lifestyle.wake : undefined,
    },
    userNotes: Array.isArray(d.userNotes)
      ? d.userNotes.filter(n => typeof n === "string").slice(0, MAX_NOTES)
      : [],
    updatedAt: typeof d.updatedAt === "string" ? d.updatedAt : "",
  };
}

export function normalizeStoredChatMessages(data: unknown): StoredChatMessage[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter(
      (m): m is StoredChatMessage =>
        !!m &&
        typeof m === "object" &&
        typeof (m as StoredChatMessage).type === "string" &&
        typeof (m as StoredChatMessage).text === "string"
    )
    .slice(-80);
}

export function updateChatKnowledgeFromFlow(
  prev: ChatKnowledge,
  flowData: LifestyleKnowledge
): ChatKnowledge {
  let goals = [...prev.goals];
  if (flowData.goal) goals = uniquePush(goals, flowData.goal, MAX_GOALS);

  return {
    goals,
    lifestyle: {
      ...prev.lifestyle,
      ...Object.fromEntries(
        Object.entries(flowData).filter(([, v]) => typeof v === "string" && v.trim())
      ),
    },
    userNotes: prev.userNotes,
    updatedAt: new Date().toISOString(),
  };
}

export function updateChatKnowledgeFromUserMessage(prev: ChatKnowledge, text: string): ChatKnowledge {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > MAX_NOTE_LENGTH) return prev;
  if (/^(自分で入力|自由に)/.test(trimmed)) return prev;
  if (/^\d{1,2}:\d{0,2}/.test(trimmed) && trimmed.length <= 12) return prev;

  let goals = prev.goals;
  if (/眠り|就寝|寝たい|早起き|起きたい|食事|生活/.test(trimmed)) {
    goals = uniquePush(prev.goals, trimmed, MAX_GOALS);
  }

  return {
    ...prev,
    goals,
    userNotes: uniquePush(prev.userNotes, trimmed, MAX_NOTES),
    updatedAt: new Date().toISOString(),
  };
}

export function buildUserKnowledgeContext(
  knowledge: ChatKnowledge,
  profile: { name: string; nickname: string; birthDate?: string; gender?: string }
): string {
  const parts: string[] = [];

  if (profile.nickname.trim()) parts.push(`呼び名（ニックネーム）: ${profile.nickname.trim()}`);
  if (profile.name.trim()) parts.push(`お名前: ${profile.name.trim()}`);
  if (profile.birthDate?.trim()) parts.push(`生年月日: ${profile.birthDate.trim()}`);
  if (profile.gender?.trim()) parts.push(`性別: ${profile.gender.trim()}`);

  if (knowledge.goals.length) {
    parts.push(`過去に伝えられた目標: ${[...new Set(knowledge.goals)].slice(0, 5).join("、")}`);
  }

  const lifestyleEntries = Object.entries(knowledge.lifestyle).filter(([, v]) => v);
  if (lifestyleEntries.length) {
    const labels: Record<string, string> = {
      goal: "生活目標",
      returnHome: "帰宅時間",
      dinner: "夕食時間",
      bath: "入浴時間",
      wake: "起床時間",
    };
    parts.push(
      "把握している生活リズム:",
      ...lifestyleEntries.map(([k, v]) => `- ${labels[k] ?? k}: ${v}`)
    );
  }

  if (knowledge.userNotes.length) {
    parts.push(`過去の相談メモ:\n${knowledge.userNotes.slice(0, 8).map(n => `- ${n}`).join("\n")}`);
  }

  return parts.join("\n");
}
