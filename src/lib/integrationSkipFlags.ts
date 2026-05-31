import type { IntegrationId } from "@/src/lib/integrationGuide";

export const INTEGRATION_SKIP_STORAGE_KEYS: Record<IntegrationId, string> = {
  supabase: "skipped_supabase",
  notion: "skipped_notion",
  googleCalendar: "skipped_google_calendar",
  healthkit: "skipped_ios_health",
  sound: "skipped_sound",
};

export function markIntegrationSkipped(id: IntegrationId): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(INTEGRATION_SKIP_STORAGE_KEYS[id], "true");
}

export function clearIntegrationSkipped(id: IntegrationId): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(INTEGRATION_SKIP_STORAGE_KEYS[id]);
}

export function isIntegrationSkipped(id: IntegrationId): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(INTEGRATION_SKIP_STORAGE_KEYS[id]) === "true";
}

export function readIntegrationSkipFlags(): Record<IntegrationId, boolean> {
  const flags = {} as Record<IntegrationId, boolean>;
  for (const [id, key] of Object.entries(INTEGRATION_SKIP_STORAGE_KEYS) as [IntegrationId, string][]) {
    flags[id] = typeof window !== "undefined" && localStorage.getItem(key) === "true";
  }
  return flags;
}
