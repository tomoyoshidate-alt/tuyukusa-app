/** Dev-only reset: triggered from AI chat with 「初期化」 */

export const DEV_RESET_MESSAGE = "初期化しました。オンボーディング画面から再スタートします。";

export const DEV_RESET_RELOAD_MS = 2000;

export function isDevResetIntent(text: string): boolean {
  return text.trim() === "初期化";
}

const DEV_RESET_KEYS = [
  "introCompleted",
  "tuyukusa-goals",
  "tuyukusa-ai-goals",
  "tuyukusa-schedule",
  "tuyukusa-schedule-templates",
  "tuyukusa-user-profile",
  "tuyukusa-chat-history",
  "tuyukusa-chat-knowledge",
  "tuyukusa-local-tasks",
  "tuyukusa-onboarding-progress",
  "tuyukusa-intro-draft",
  "tuyukusa-health-data",
  "tuyukusa-voice-hint-shown",
  "skipped_supabase",
  "skipped_notion",
  "skipped_google_calendar",
  "skipped_ios_health",
  "skipped_sound",
] as const;

export function runDevReset(): void {
  if (typeof window === "undefined") return;
  for (const key of DEV_RESET_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

export function scheduleDevResetReload(): void {
  if (typeof window === "undefined") return;
  window.setTimeout(() => window.location.reload(), DEV_RESET_RELOAD_MS);
}
