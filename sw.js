const CACHE_NAME = "zenith-v9";
self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => { return self.clients.claim(); });
self.addEventListener("fetch", (e) => {
    // Mem-bypass fetch untuk memastikan data selalu baru
});
