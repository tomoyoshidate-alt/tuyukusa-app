import {
  AI_MODULE_STORAGE_KEY,
  DEFAULT_AI_MODULE_ID,
  type AiModule,
  type AiModuleSelection,
} from "./types";
import {
  buildModuleSystemPrompt,
  getActiveModules,
  getDefaultModule,
  getModuleById,
  resolveModuleId,
} from "./modules";
import type { AppLocale } from "../i18n/detectLocale";

export { getActiveModules, getDefaultModule, getModuleById, buildModuleSystemPrompt, resolveModuleId };

export const INITIAL_AI_MODULE_SELECTION: AiModuleSelection = {
  selectedModuleId: DEFAULT_AI_MODULE_ID,
  updatedAt: "",
};

export function normalizeAiModuleSelection(data: unknown): AiModuleSelection {
  if (!data || typeof data !== "object") return { ...INITIAL_AI_MODULE_SELECTION };
  const d = data as Partial<AiModuleSelection>;
  return {
    selectedModuleId: resolveModuleId(d.selectedModuleId),
    updatedAt: typeof d.updatedAt === "string" ? d.updatedAt : "",
  };
}

export function loadAiModuleSelection(): AiModuleSelection {
  if (typeof window === "undefined") return { ...INITIAL_AI_MODULE_SELECTION };
  try {
    const raw = localStorage.getItem(AI_MODULE_STORAGE_KEY);
    if (raw) return normalizeAiModuleSelection(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return { ...INITIAL_AI_MODULE_SELECTION };
}

/**
 * Persist selected module. Chat history and user traits (Layer 3) are NOT cleared —
 * only the domain specialization (Layer 2) changes.
 */
export function saveAiModuleSelection(moduleId: string): AiModuleSelection {
  const resolved = resolveModuleId(moduleId);
  const selection: AiModuleSelection = {
    selectedModuleId: resolved,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(AI_MODULE_STORAGE_KEY, JSON.stringify(selection));
  }
  return selection;
}

export function getSelectedModule(): AiModule {
  const { selectedModuleId } = loadAiModuleSelection();
  return getModuleById(selectedModuleId) ?? getDefaultModule();
}

export function getSelectedModuleSystemPrompt(locale: AppLocale = "ja"): string {
  return buildModuleSystemPrompt(getSelectedModule(), locale);
}

/** Server-side: resolve module from request body moduleId. */
export function loadModuleForChat(moduleId: string | undefined | null, locale: AppLocale): {
  module: AiModule;
  systemPrompt: string;
} {
  const id = resolveModuleId(moduleId);
  const module = getModuleById(id) ?? getDefaultModule();
  return { module, systemPrompt: buildModuleSystemPrompt(module, locale) };
}
