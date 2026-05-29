const CACHE = "tuyukoro-timer-v1";
let alarmTimeoutId = null;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

async function showAlarmNotification(title, body) {
  const options = {
    body,
    requireInteraction: true,
    vibrate: [400, 150, 400, 150, 400, 150, 400],
    tag: "pomodoro-alarm",
    renotify: true,
    icon: "/favicon.ico",
    data: { alarm: true },
  };
  await self.registration.showNotification(title, options);
}

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || !data.type) return;

  if (data.type === "STOP_ALARM") {
    if (alarmTimeoutId) {
      clearTimeout(alarmTimeoutId);
      alarmTimeoutId = null;
    }
    self.registration.getNotifications({ tag: "pomodoro-alarm" }).then((items) => {
      items.forEach((n) => n.close());
    });
    return;
  }

  if (data.type === "POMODORO_ALARM") {
    event.waitUntil(showAlarmNotification(data.title || "タイマー", data.body || "時間です"));
    return;
  }

  if (data.type === "SCHEDULE_ALARM" && data.endTime) {
    if (alarmTimeoutId) clearTimeout(alarmTimeoutId);
    const delay = data.endTime - Date.now();
    if (delay <= 0) {
      event.waitUntil(showAlarmNotification(data.title || "タイマー", data.body || "時間です"));
      return;
    }
    if (delay < 2 * 60 * 60 * 1000) {
      alarmTimeoutId = setTimeout(() => {
        showAlarmNotification(data.title || "タイマー", data.body || "時間です");
      }, delay);
    }
    event.waitUntil(
      caches.open(CACHE).then((cache) =>
        cache.put(
          "scheduled-alarm",
          new Response(
            JSON.stringify({
              endTime: data.endTime,
              title: data.title,
              body: data.body,
            })
          )
        )
      )
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return self.clients.openWindow("/");
    })
  );
});
