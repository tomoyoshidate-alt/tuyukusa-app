import { binauralPlaybackManager } from "@/src/lib/binauralPlaybackManager";

export const ALARM_TRIGGER_EVENT = "tuyukusa-alarm-trigger";

export type AlarmTriggerDetail = {
  title: string;
  body: string;
  source: "pomodoro" | "binaural";
};

let initialized = false;

export function initAlarmCoordinator(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", event => {
      const data = event.data;
      if (!data || data.type !== "ALARM_TRIGGER") return;
      const detail: AlarmTriggerDetail = {
        title: data.title ?? "タイマー",
        body: data.body ?? "時間です",
        source: data.source === "binaural" ? "binaural" : "pomodoro",
      };
      if (detail.source === "binaural") {
        binauralPlaybackManager.onTimerExpiredFromSw(detail.title, detail.body);
      }
      window.dispatchEvent(new CustomEvent(ALARM_TRIGGER_EVENT, { detail }));
    });
  }
}

export function stopGlobalAlarm(): void {
  binauralPlaybackManager.stopAlarm();
}
