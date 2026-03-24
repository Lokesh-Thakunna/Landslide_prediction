const APP_SHELL_CACHE = "hhlews-app-shell-v1";
const MAP_TILE_CACHE = "hhlews-map-tiles-v2";
const TILE_ZOOMS = [10, 11, 12, 13];

const APP_SHELL_URLS = ["/", "/manifest.webmanifest", "/favicon.svg", "/demo-data/citizen.json"];

const DISTRICT_BBOX = {
  dist_chamoli: { north: 30.95, south: 30.05, west: 79.1, east: 80.15 },
  dist_rudraprayag: { north: 30.75, south: 30.15, west: 78.7, east: 79.45 },
  dist_uttarkashi: { north: 31.2, south: 30.15, west: 77.85, east: 79.35 },
  dist_pithoragarh: { north: 30.95, south: 29.45, west: 79.6, east: 81.05 },
  dist_bageshwar: { north: 30.2, south: 29.55, west: 79.45, east: 80.2 },
  dist_nainital: { north: 29.7, south: 28.85, west: 78.55, east: 79.95 },
};

const cachedDistrictIds = new Set();

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const payload = event.data;
  if (!payload || payload.type !== "PRECACHE_DISTRICT") {
    return;
  }

  event.waitUntil(preCacheDistrict(payload.districtId));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, APP_SHELL_CACHE, "/"));
    return;
  }

  if (isMapTileRequest(url)) {
    event.respondWith(cacheFirst(request, MAP_TILE_CACHE));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, APP_SHELL_CACHE));
  }
});

async function preCacheDistrict(rawDistrictId) {
  const districtId = normalizeDistrictId(rawDistrictId);
  const bounds = DISTRICT_BBOX[districtId];

  if (!bounds) {
    await broadcastStatus({
      districtId,
      status: "error",
      message: "This district is not in the offline pilot cache list yet.",
    });
    return;
  }

  if (cachedDistrictIds.has(districtId)) {
    await broadcastStatus({
      districtId,
      status: "ready",
      message: "Offline guidance is already cached for this district.",
    });
    return;
  }

  await broadcastStatus({
    districtId,
    status: "preparing",
    message: "Caching app shell and district map tiles for offline guidance...",
  });

  const cache = await caches.open(MAP_TILE_CACHE);
  const tileUrls = getTileUrlsForBounds(bounds);

  for (const url of tileUrls) {
    try {
      const response = await fetch(url, { mode: "no-cors" });
      if (response.ok || response.type === "opaque") {
        await cache.put(url, response);
      }
    } catch {
      // Ignore individual tile failures so partial offline guidance still succeeds.
    }
  }

  cachedDistrictIds.add(districtId);
  await broadcastStatus({
    districtId,
    status: "ready",
    message: "Offline guidance is cached for this district. Compass fallback is ready.",
  });
}

function normalizeDistrictId(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase().replace(/-/g, "_");
}

function getTileUrlsForBounds(bounds) {
  const urls = [];

  for (const zoom of TILE_ZOOMS) {
    const xMin = lonToTile(bounds.west, zoom);
    const xMax = lonToTile(bounds.east, zoom);
    const yMin = latToTile(bounds.north, zoom);
    const yMax = latToTile(bounds.south, zoom);

    for (let x = xMin; x <= xMax; x += 1) {
      for (let y = yMin; y <= yMax; y += 1) {
        urls.push(`https://tiles.openfreemap.org/styles/liberty/${zoom}/${x}/${y}.png`);
      }
    }
  }

  return urls;
}

function lonToTile(lon, zoom) {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function latToTile(lat, zoom) {
  const radians = (lat * Math.PI) / 180;
  const numerator = 1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI;
  return Math.floor((numerator / 2) * Math.pow(2, zoom));
}

function isMapTileRequest(url) {
  return url.hostname === "tiles.openfreemap.org";
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) ?? (await cache.match(fallbackUrl));
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok || response.type === "opaque") {
        void cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    return cached;
  }

  return (await networkPromise) ?? Response.error();
}

async function broadcastStatus({ districtId, status, message }) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });

  for (const client of clients) {
    client.postMessage({
      type: "OFFLINE_CACHE_STATUS",
      districtId,
      status,
      cachedDistrictIds: Array.from(cachedDistrictIds),
      message,
    });
  }
}
