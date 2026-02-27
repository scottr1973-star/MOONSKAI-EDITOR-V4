/*
FILE: /sw.js
PURPOSE: Moonskai Editor v3 Service Worker — offline caching for GitHub Pages/localhost.
CREATED BY: Scott Russo.
*/
const CACHE_NAME = "moonskai-editor-v3.0.1"; // bump to force clients to refresh cached app shell

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./moonskai-editor.js",
  "./manifest.json",

  "./vendor/monaco/vs/loader.js",
  "./vendor/monaco/vs/editor/editor.main.js",
  "./vendor/monaco/vs/editor/editor.main.css",
  "./vendor/monaco/vs/base/common/worker/simpleWorker.nls.js",
  "./vendor/monaco/vs/base/worker/workerMain.js",

  "./vendor/monaco/vs/basic-languages/javascript/javascript.js",
  "./vendor/monaco/vs/basic-languages/typescript/typescript.js",
  "./vendor/monaco/vs/basic-languages/html/html.js",
  "./vendor/monaco/vs/basic-languages/css/css.js",
  "./vendor/monaco/vs/basic-languages/json/json.js",
  "./vendor/monaco/vs/basic-languages/yaml/yaml.js",
  "./vendor/monaco/vs/basic-languages/markdown/markdown.js",
];

// Cache what we can during install; don't fail install if one asset 404s.
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
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

  // For navigations (HTML), prefer network first so UI changes show up without hard refresh.
  const isNav = req.mode === "navigate" || (req.destination === "document");

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      if (isNav) {
        try {
          const res = await fetch(req);
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        } catch (_) {
          const shell = await cache.match("./index.html", { ignoreSearch: true });
          return shell || new Response("Offline", { status: 503, statusText: "Offline" });
        }
      }

      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;

      try {
        const res = await fetch(req);
        const url = new URL(req.url);
        if (url.origin === location.origin && res && res.ok) {
          cache.put(req, res.clone());
        }
        return res;
      } catch (_) {
        const shell = await cache.match("./index.html", { ignoreSearch: true });
        return shell || new Response("Offline", { status: 503, statusText: "Offline" });
      }
    })()
  );
});