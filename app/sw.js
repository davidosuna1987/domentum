// App shell: cache-first per version. Sounds: cache-first in their own long-lived
// cache, filled on first play or via "Descargar todo".
const VERSION = 'domentum-app-v2';
const SOUNDS = 'domentum-sounds-v1';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/base.css',
  'js/app.js', 'js/engine.js', 'js/catalog.js', 'js/icons.js', 'js/bg.js', 'js/store.js', 'js/noise-worklet.js', 'js/themes/index.js',
  'icons/icon.svg', 'icons/mark.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'sounds/credits.json', 'sounds/manifest.json',
];
// Every theme, so any of them can be picked offline. Their fonts are cached the first time they load.
const THEMES = ['zen', 'original', 'editorial', 'consola', 'terminal', 'cine', 'naturalista', 'aurora', 'bento', 'neumorfico', 'pop'];
const EXTRAS = THEMES.flatMap(id => [`css/themes/${id}.css`, `js/themes/${id}.js`, `icons/themes/${id}-light.jpg`, `icons/themes/${id}-dark.jpg`]);
const FONTS = ['shippori-mincho', 'inter-tight', 'jetbrains-mono', 'archivo', 'share-tech-mono', 'ibm-plex-mono', 'instrument-serif',
  'inter', 'fraunces', 'caveat', 'unbounded', 'manrope', 'nunito', 'bricolage-grotesque'].map(f => `fonts/${f}.css`);

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(async c => {
    await c.addAll(SHELL);
    await Promise.allSettled([...EXTRAS, ...FONTS].map(u => c.add(u)));
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('domentum-app-') && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (url.pathname.includes('/sounds/') && url.pathname.endsWith('.m4a')) {
    e.respondWith(
      caches.open(SOUNDS).then(async c => {
        const hit = await c.match(req, { ignoreSearch: true });
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok && res.status === 200) c.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode === 'navigate') {
    // network first so updates arrive, cached shell when offline
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put('index.html', copy));
          return res;
        })
        .catch(() => caches.match('index.html')),
    );
    return;
  }

  // stale-while-revalidate: instant from cache, refreshed in the background for next launch
  e.respondWith(
    caches.open(VERSION).then(async c => {
      const hit = await c.match(req, { ignoreSearch: true });
      const net = fetch(req)
        .then(res => {
          if (res.ok) c.put(req, res.clone());
          return res;
        })
        .catch(() => hit);
      if (hit) {
        e.waitUntil(net);
        return hit;
      }
      return net;
    }),
  );
});
