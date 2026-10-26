// Kill switch for the old mock backend (a Service Worker that answered /login).
// A browser that ran it keeps it even after the file is gone, so this replaces it:
// on the next visit the browser installs this version, which unregisters itself and
// reloads open tabs. Delete this file once no one has visited with the mock for a while.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(
  self.registration.unregister()
    .then(() => self.clients.matchAll())
    .then((clients) => Promise.all(clients.map((client) => client.navigate(client.url)))),
));
