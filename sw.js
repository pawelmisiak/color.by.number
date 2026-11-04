// Offline support: keeps a copy of the game so it still opens without internet.
const CACHE = 'critters-v3';
const FILES = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest',
  'js/main.js', 'js/art.js', 'js/art/shapes.js', 'js/art/animals.js', 'js/art/sea.js', 'js/art/dinos.js', 'js/art/food.js', 'js/art/vehicles.js', 'js/art/monsters.js', 'js/art/blocky.js', 'js/raster.js', 'js/board.js', 'js/store.js', 'js/sound.js', 'js/confetti.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const font = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !font) return;

  // App files: try the network first so updates show up straight away, fall back to the cache offline.
  // Fonts: cache first, they never change.
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      if (font) {
        const hit = await cache.match(req);
        if (hit) return hit;
      }
      try {
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
        return res;
      } catch (err) {
        const hit = await cache.match(req, { ignoreSearch: true });
        if (hit) return hit;
        throw err;
      }
    }),
  );
});
