export async function registerTimerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    return registration;
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export function notifyTimerServiceWorker(payload: {
  type: "POMODORO_ALARM" | "SCHEDULE_ALARM" | "STOP_ALARM";
  title?: string;
  body?: string;
  endTime?: number;
}): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const controller = navigator.serviceWorker.controller;
  if (controller) {
    controller.postMessage(payload);
    return;
  }
  void navigator.serviceWorker.ready.then(reg => {
    reg.active?.postMessage(payload);
  });
}

export function scheduleSwAlarm(endTime: number, title: string, body: string): void {
  notifyTimerServiceWorker({ type: "SCHEDULE_ALARM", endTime, title, body });
}

export function fireSwAlarm(title: string, body: string): void {
  notifyTimerServiceWorker({ type: "POMODORO_ALARM", title, body });
}

export function stopSwAlarm(): void {
  notifyTimerServiceWorker({ type: "STOP_ALARM" });
}
