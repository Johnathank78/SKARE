/* SKARE — Service Worker : app shell offline-first.
   Précache la coque complète (HTML, JS/JSX, libs vendor auto-hébergées,
   icônes, manifest) pour un fonctionnement 100% hors-ligne après la
   première visite. Les données utilisateur vivent dans IndexedDB (Dexie),
   le SW ne s'occupe donc que de la coque applicative.

   Stratégie : cache-first sur les ressources précachées. Cache versionné ;
   les anciens caches sont supprimés à l'activation. Les navigations
   retombent toujours sur le HTML de l'app (gère start_url "."). */

const CACHE = 'skare-shell-v5';

/* Fichier d'entrée = index.html (sert aussi d'index de répertoire sur
   GitHub Pages, donc start_url "." fonctionne dès la première visite). */
const APP_HTML = 'index.html';

const PRECACHE = [
  APP_HTML,
  'manifest.webmanifest',
  // libs auto-hébergées (offline) — remplacent les CDN unpkg
  'vendor/react.development.js',
  'vendor/react-dom.development.js',
  'vendor/babel.min.js',
  'vendor/dexie.min.js',
  // données + couche DB
  'skare-data.js',
  'skare-db.js',
  // scaffolds
  'tweaks-panel.jsx',
  // composants SKARE
  'skare-icons.jsx',
  'skare-timer.jsx',
  'skare-card.jsx',
  'skare-editor.jsx',
  'skare-products.jsx',
  'skare-journal.jsx',
  'skare-app.jsx',
  // icônes
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png',
  'apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Navigations (y compris start_url ".") → on sert toujours la coque HTML.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match(req).then((hit) =>
        hit || caches.match(APP_HTML).then((html) => html || fetch(req))
      )
    );
    return;
  }

  // Reste : cache-first, repli réseau (et mise en cache opportuniste).
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => hit);
    })
  );
});
