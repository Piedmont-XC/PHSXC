// PHSXC no-cache cleanup v10
self.addEventListener("install", event => self.skipWaiting());
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});
