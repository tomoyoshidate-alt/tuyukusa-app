/** Timer-end options shared by BB and Pomodoro. */
export type TimerEndSettings = {
  airplaneModeOnEnd: boolean;
};

export const TIMER_END_SETTINGS_KEY = "tuyukusa-timer-end-settings";

export const AIRPLANE_MODE_SHORTCUT_NAME = "機内モードをオン";

export const AIRPLANE_MODE_SHORTCUT_URL = `shortcuts://run-shortcut?name=${encodeURIComponent(AIRPLANE_MODE_SHORTCUT_NAME)}`;

export const DEFAULT_TIMER_END_SETTINGS: TimerEndSettings = {
  airplaneModeOnEnd: false,
};

export function normalizeTimerEndSettings(data: unknown): TimerEndSettings {
  if (!data || typeof data !== "object") return DEFAULT_TIMER_END_SETTINGS;
  const d = data as Partial<TimerEndSettings>;
  return {
    airplaneModeOnEnd: d.airplaneModeOnEnd === true,
  };
}

export function readTimerEndSettings(): TimerEndSettings {
  if (typeof window === "undefined") return DEFAULT_TIMER_END_SETTINGS;
  try {
    const raw = localStorage.getItem(TIMER_END_SETTINGS_KEY);
    return raw ? normalizeTimerEndSettings(JSON.parse(raw)) : DEFAULT_TIMER_END_SETTINGS;
  } catch {
    return DEFAULT_TIMER_END_SETTINGS;
  }
}

export function writeTimerEndSettings(settings: TimerEndSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TIMER_END_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

/** Open iOS Shortcuts to run the airplane-mode shortcut (user must create it first). */
export function triggerAirplaneModeShortcutIfEnabled(): void {
  if (typeof window === "undefined") return;
  const settings = readTimerEndSettings();
  if (!settings.airplaneModeOnEnd) return;
  try {
    window.location.href = AIRPLANE_MODE_SHORTCUT_URL;
  } catch {
    /* ignore */
  }
}
