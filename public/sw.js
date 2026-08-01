self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Always fetch directly from network without caching in dev/preview
  return;
});

// 1. BACKGROUND SYNC (for offline health data & sensor step queues)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-health-logs' || event.tag === 'sync-sensor-data') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'BACKGROUND_SYNC_TRIGGERED' });
        });
      })
    );
  }
});

// 2. PERIODIC BACKGROUND SYNC (for periodic health & step sync)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'step-sync-task' || event.tag === 'daily-health-sync') {
    event.waitUntil(
      (async () => {
        const clients = await self.clients.matchAll();
        if (clients.length > 0) {
          clients.forEach((client) => {
            client.postMessage({ type: 'PERIODIC_SYNC_TRIGGERED' });
          });
        } else if (self.registration.showNotification) {
          await self.registration.showNotification('Real Life Track', {
            body: `Seus passos e dados de saúde foram sincronizados em segundo plano.`,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'health-sync-reminder'
          });
        }
      })()
    );
  }
});

// 3. PUSH NOTIFICATIONS
self.addEventListener('push', (event) => {
  let data = { title: 'Real Life Track', body: 'Lembrete de saúde e atividades ativas!' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'Sua rotina de saúde está em andamento.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Real Life Track', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// 4. MESSAGING FROM FOREGROUND
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'STEP_UPDATE') {
    lastStepCount = event.data.steps;
  }
});

