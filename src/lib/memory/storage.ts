import {
  AI_MEMORIES_STORAGE_KEY,
  EXTRACT_RATE_LIMIT_MS,
  MEMORY_CATEGORIES,
  MEMORY_EXTRACT_LAST_KEY,
  MEMORY_USER_ID_KEY,
  type AiMemory,
  type MemoryCategory,
} from "./types";

export type AiMemoryStore = {
  userId: string;
  memories: AiMemory[];
};

function isMemoryCategory(value: string): value is MemoryCategory {
  return (MEMORY_CATEGORIES as readonly string[]).includes(value);
}

export function normalizeAiMemory(data: unknown): AiMemory | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Partial<AiMemory>;
  if (typeof d.id !== "string" || typeof d.content !== "string" || typeof d.category !== "string") {
    return null;
  }
  if (!isMemoryCategory(d.category)) return null;
  return {
    id: d.id,
    userId: typeof d.userId === "string" ? d.userId : "",
    content: d.content.trim(),
    category: d.category,
    confidence: typeof d.confidence === "number" ? d.confidence : 0.7,
    sourceModuleId: typeof d.sourceModuleId === "string" ? d.sourceModuleId : "",
    createdAt: typeof d.createdAt === "string" ? d.createdAt : new Date().toISOString(),
    updatedAt: typeof d.updatedAt === "string" ? d.updatedAt : new Date().toISOString(),
  };
}

export function normalizeAiMemoryStore(data: unknown, userId: string): AiMemoryStore {
  if (!data || typeof data !== "object") return { userId, memories: [] };
  const d = data as Partial<AiMemoryStore>;
  const memories = Array.isArray(d.memories)
    ? d.memories.map(normalizeAiMemory).filter((m): m is AiMemory => m !== null)
    : [];
  return { userId: typeof d.userId === "string" ? d.userId : userId, memories };
}

export function getMemoryUserId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const supabaseRaw = localStorage.getItem("tuyukusa-supabase");
    if (supabaseRaw) {
      const parsed = JSON.parse(supabaseRaw) as { syncId?: string };
      if (parsed.syncId?.trim()) return `sync:${parsed.syncId.trim()}`;
    }
    const syncKey = localStorage.getItem("syncKey")?.trim();
    if (syncKey) return `sync:${syncKey}`;
  } catch {
    /* ignore */
  }

  let id = localStorage.getItem(MEMORY_USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(MEMORY_USER_ID_KEY, id);
  }
  return id;
}

export function loadAiMemoryStore(): AiMemoryStore {
  const userId = getMemoryUserId();
  if (typeof window === "undefined") return { userId, memories: [] };
  try {
    const raw = localStorage.getItem(AI_MEMORIES_STORAGE_KEY);
    if (raw) return normalizeAiMemoryStore(JSON.parse(raw), userId);
  } catch {
    /* ignore */
  }
  return { userId, memories: [] };
}

export function saveAiMemoryStore(store: AiMemoryStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AI_MEMORIES_STORAGE_KEY, JSON.stringify(store));
}

export function loadAllMemories(): AiMemory[] {
  return loadAiMemoryStore().memories;
}

export function loadMemoriesForPrompt(limit = 30): AiMemory[] {
  return [...loadAllMemories()]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

export function getMemoriesByCategory(category: MemoryCategory, limit = 20): AiMemory[] {
  return loadAllMemories()
    .filter(m => m.category === category)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

export function upsertMemories(memories: AiMemory[]): void {
  const store = loadAiMemoryStore();
  const byId = new Map(store.memories.map(m => [m.id, m]));
  for (const mem of memories) byId.set(mem.id, mem);
  saveAiMemoryStore({
    userId: store.userId,
    memories: Array.from(byId.values()),
  });
}

export function replaceAllMemories(memories: AiMemory[]): void {
  const store = loadAiMemoryStore();
  saveAiMemoryStore({ userId: store.userId, memories });
}

export function deleteMemoryById(id: string): void {
  const store = loadAiMemoryStore();
  saveAiMemoryStore({
    userId: store.userId,
    memories: store.memories.filter(m => m.id !== id),
  });
}

export function loadLastExtractAt(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(MEMORY_EXTRACT_LAST_KEY);
}

export function saveLastExtractAt(iso: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MEMORY_EXTRACT_LAST_KEY, iso);
}

export function canExtractNow(now = Date.now()): boolean {
  const last = loadLastExtractAt();
  if (!last) return true;
  const elapsed = now - new Date(last).getTime();
  return elapsed >= EXTRACT_RATE_LIMIT_MS;
}

export function newMemoryId(): string {
  return crypto.randomUUID();
}
