const CACHE = "tuyukusa-app-v1";
const OFFLINE_URLS = ["/", "/manifest.json", "/icons/icon-192.svg", "/icons/icon-512.svg"];

let alarmTimeoutId = null;

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(OFFLINE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok && (url.pathname === "/" || url.pathname.startsWith("/icons/") || url.pathname === "/manifest.json")) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const fallback = await caches.match("/");
          if (fallback) return fallback;
        }
        return new Response("オフラインです", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      })
  );
});

async function showAlarmNotification(title, body) {
  await self.registration.showNotification(title, {
    body,
    requireInteraction: true,
    vibrate: [400, 150, 400, 150, 400, 150, 400],
    tag: "pomodoro-alarm",
    renotify: true,
    icon: "/icons/icon-192.svg",
    data: { alarm: true },
  });
}

async function notifyClientsAlarm(title, body, source) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  clients.forEach(client => {
    client.postMessage({ type: "ALARM_TRIGGER", title, body, source: source || "pomodoro" });
  });
}

async function triggerAlarm(title, body, source) {
  await showAlarmNotification(title, body);
  await notifyClientsAlarm(title, body, source);
}

self.addEventListener("message", event => {
  const data = event.data;
  if (!data || !data.type) return;

  if (data.type === "STOP_ALARM") {
    if (alarmTimeoutId) {
      clearTimeout(alarmTimeoutId);
      alarmTimeoutId = null;
    }
    self.registration.getNotifications({ tag: "pomodoro-alarm" }).then(items => {
      items.forEach(n => n.close());
    });
    return;
  }

  if (data.type === "POMODORO_ALARM") {
    event.waitUntil(triggerAlarm(data.title || "タイマー", data.body || "時間です", data.source));
    return;
  }

  if (data.type === "SCHEDULE_ALARM" && data.endTime) {
    if (alarmTimeoutId) clearTimeout(alarmTimeoutId);
    const delay = data.endTime - Date.now();
    const title = data.title || "タイマー";
    const body = data.body || "時間です";
    const source = data.source || "pomodoro";
    if (delay <= 0) {
      event.waitUntil(triggerAlarm(title, body, source));
      return;
    }
    if (delay < 4 * 60 * 60 * 1000) {
      alarmTimeoutId = setTimeout(() => {
        triggerAlarm(title, body, source);
      }, delay);
    }
  }
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) return clientList[0].focus();
      return self.clients.openWindow("/");
    })
  );
});
