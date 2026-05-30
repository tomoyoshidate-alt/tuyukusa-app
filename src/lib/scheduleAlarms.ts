import {
  registerTimerServiceWorker,
  requestNotificationPermission,
  scheduleSwAlarm,
} from "./timerServiceWorker";

type ScheduleItemLike = { time: string; label: string; sub?: string };

function timeToTodayTimestamp(time: string): number | null {
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const d = new Date();
  d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
  if (d.getTime() <= Date.now()) return null;
  return d.getTime();
}

export async function registerTodayScheduleAlarms(items: ScheduleItemLike[]): Promise<number> {
  await registerTimerServiceWorker();
  const perm = await requestNotificationPermission();
  if (perm !== "granted") return 0;

  let count = 0;
  for (const item of items) {
    const endTime = timeToTodayTimestamp(item.time);
    if (!endTime) continue;
    scheduleSwAlarm(
      endTime,
      item.label,
      item.sub?.trim() ? item.sub : `${item.label}の時間です`,
      "pomodoro"
    );
    count++;
  }
  return count;
}
