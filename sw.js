const SCOPE_PATH = new URL('./', self.location.href).pathname;
const CACHE_PREFIX = `lumi-vocab:${SCOPE_PATH}:`;
const CACHE = `${CACHE_PREFIX}v1.3`;
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png',
  './vocabulary-advanced.js?v=1.3', './features.css?v=1.3', './learning.js?v=1.3', './pronunciation.js?v=1.3', './haptics.js?v=1.3', './offline.js?v=1.3',
  './audio-library.js?v=1.3', './audio-manifest.json', './audio/attribution.json', './THIRD-PARTY-NOTICES.txt'];
let offlineStatus = { type: 'lumi-offline', done: 0, total: ASSETS.length };

async function announce() {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of clients) client.postMessage(offlineStatus);
}

async function precache() {
  const cache = await caches.open(CACHE);
  try {
    await cache.addAll(ASSETS.map(url => new Request(new URL(url, self.location.href), { cache: 'reload' })));
    const manifest = await (await cache.match('./audio-manifest.json')).json();
    const files = manifest.filter(file => /^\.\/audio\/[a-zA-Z'-]+\.mp3$/.test(file));
    offlineStatus.total = ASSETS.length + files.length;
    offlineStatus.done = ASSETS.length;
    await announce();
    for (let index = 0; index < files.length; index += 8) {
      await Promise.all(files.slice(index, index + 8).map(async file => {
        for (let attempt = 0; attempt < 3; attempt++) {
          try { await cache.add(new Request(new URL(file, self.location.href), { cache: 'reload' })); return; }
          catch (error) { if (attempt === 2) throw error; }
        }
      }));
      offlineStatus.done = ASSETS.length + Math.min(files.length, index + 8);
      await announce();
    }
    await cache.put(new URL('./__offline-ready', self.location.href), new Response('v1.3'));
    offlineStatus.ready = true;
    await announce();
    await self.skipWaiting();
  } catch (error) {
    offlineStatus.error = true;
    await announce();
    throw error;
  }
}

self.addEventListener('install', event => {
  event.waitUntil(precache());
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys
      .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
      .map(key => caches.delete(key))))
    .then(() => self.clients.claim())
    .then(announce));
});

self.addEventListener('message', event => {
  if (event.data?.type !== 'lumi-status') return;
  event.waitUntil(caches.open(CACHE).then(async cache => {
    const ready = !!(await cache.match(new URL('./__offline-ready', self.location.href)));
    event.source?.postMessage({ ...offlineStatus, ready });
  }));
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE_PATH)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(event.request);
    if (cached && event.request.mode !== 'navigate') return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok && response.type !== 'opaque') await cache.put(event.request, response.clone());
      return response;
    } catch {
      if (event.request.mode === 'navigate') {
        const page = cached || await cache.match('./index.html');
        if (page) return page;
      }
      return Response.error();
    }
  }));
});
