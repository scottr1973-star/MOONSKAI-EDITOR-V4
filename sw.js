/*
FILE: /sw.js
PURPOSE: Moonskai Editor v3 Service Worker — offline caching for GitHub Pages/localhost.
CREATED BY: Scott Russo.
*/
const CACHE_NAME = "moonskai-editor-v3.0.0";

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./moonskai-editor.js",
  "./manifest.json",

  // Monaco essentials (match your current folder layout)
  "./vendor/monaco/vs/loader.js",
  "./vendor/monaco/vs/editor/editor.main.js",
  "./vendor/monaco/vs/editor/editor.main.css",
  "./vendor/monaco/vs/base/common/worker/simpleWorker.nls.js",
  "./vendor/monaco/vs/base/worker/workerMain.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Cache what we can; don't fail the whole install if one URL 404s.
    await Promise.allSettled(ASSETS.map((u) => cache.add(u)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;

      try {
        const res = await fetch(req);
        // Cache same-origin assets
        const url = new URL(req.url);
        if (url.origin === location.origin && res && res.ok) {
          cache.put(req, res.clone());
        }
        return res;
      } catch (e) {
        // Fallback to app shell
        const shell = await cache.match("./index.html", { ignoreSearch: true });
        return shell || new Response("Offline", { status: 503, statusText: "Offline" });
      }
    })()
  );
});