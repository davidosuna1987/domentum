// The player used to live at the site root and its service worker had this URL. The player is now in app/
// with its own worker, so this one only cleans up: it drops the old shell caches (the downloaded sounds,
// "domentum-sounds-v1", stay for the new player) and unregisters itself. It never handles requests.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => /^domentum-v\d+$/.test(k)).map(k => caches.delete(k))))
      .then(() => self.registration.unregister()),
  );
});
