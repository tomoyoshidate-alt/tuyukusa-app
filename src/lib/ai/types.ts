/** Layer 2 persona — shared voice across modules (traits stay when switching). */
export type AiPersona = {
  display_name: string;
  tone: string;
};

/** Layer 2 module — domain-specific AI specialization. */
export type AiModule = {
  id: string;
  name: string;
  display_name: string;
  emoji: string;
  tagline: string;
  persona: AiPersona;
  /** Domain system prompt (Japanese). Layer 3/4 context is appended at request time. */
  system_prompt: string;
  sort_order: number;
  is_active: boolean;
};

export type AiModuleSelection = {
  /** Selected module id. Chat history & traits are unchanged when this changes. */
  selectedModuleId: string;
  updatedAt: string;
};

export const DEFAULT_AI_MODULE_ID = "date-general-v1";

export const AI_MODULE_STORAGE_KEY = "tuyukusa-ai-module";
