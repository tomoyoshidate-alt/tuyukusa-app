export const MEMORY_CATEGORIES = [
  "constitution",
  "lifestyle",
  "preference",
  "symptom_pattern",
  "family",
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export type AiMemory = {
  id: string;
  userId: string;
  content: string;
  category: MemoryCategory;
  confidence: number;
  sourceModuleId: string;
  createdAt: string;
  updatedAt: string;
};

export type ExtractedMemoryCandidate = {
  content: string;
  category: MemoryCategory;
  confidence: number;
};

export type MemoryCurationAction = "new" | "duplicate" | "update";

export type MemoryCurationDecision = {
  index: number;
  action: MemoryCurationAction;
  existingId?: string;
  content?: string;
};

export const MEMORY_CATEGORY_LABELS: Record<MemoryCategory, string> = {
  constitution: "体質",
  lifestyle: "生活リズム",
  preference: "好み・こだわり",
  symptom_pattern: "症状の傾向",
  family: "家族・環境",
};

export const MIN_MEMORY_CONFIDENCE = 0.7;
export const MAX_EXTRACTED_MEMORIES = 5;
export const MAX_EXISTING_FOR_CURATION = 20;
export const MAX_MEMORIES_IN_PROMPT = 30;
export const EXTRACT_RATE_LIMIT_MS = 10 * 60 * 1000;

export const AI_MEMORIES_STORAGE_KEY = "tuyukusa-ai-memories";
export const MEMORY_EXTRACT_LAST_KEY = "tuyukusa-memory-extract-last";
export const MEMORY_USER_ID_KEY = "tuyukusa-memory-user-id";
