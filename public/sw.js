const CACHE_NAME = 'sahra-molaa-v2';
const PRECACHE_URLS = ['/manifest.json', '/icon.svg'];

const BLOCKED_HOSTS = [
  'firestore.googleapis.com',
  'firebase.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'api.imgbb.com',
  'freeimage.host',
  'res.cloudinary.com',
];

function isDevRequest(url) {
  const path = url.pathname;
  return (
    path.startsWith('/src/') ||
    path.startsWith('/@') ||
    path.startsWith('/node_modules/') ||
    path.endsWith('.ts') ||
    path.endsWith('.tsx') ||
    url.searchParams.has('t') ||
    url.searchParams.has('v')
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never cache Firestore, Firebase, or external upload/media API requests
  if (url.origin !== self.location.origin) return;
  if (BLOCKED_HOSTS.some((host) => url.hostname.includes(host))) return;
  if (url.pathname === '/sw.js') return;

  // Never intercept or cache Vite dev server modules; clear old caches if detected
  if (isDevRequest(url)) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response && response.ok) {
            const copy = response.clone();
            const html = await response.clone().text().catch(() => '');
            // Only cache built production HTML, never Vite dev HTML
            if (html && !html.includes('/@vite/client') && !html.includes('/src/main.tsx')) {
              caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
            }
          }
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Only cache static production assets and app icons
  const isCacheableStatic =
    url.pathname.startsWith('/assets/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/icon.svg' ||
    url.pathname === '/apple-touch-icon.png';

  if (!isCacheableStatic) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
