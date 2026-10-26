// MOCK ONLY. A fake backend running in the browser as a Service Worker.
// It answers the same URLs, with the same HTML fragments, as the real server will.
// It must sit at the web root: a service worker only sees requests under its own folder.
importScripts('/mock/templates.js');

const LATENCY_MS = 400; // pretend the network is slow, so loading states are visible

const routes = {
  'POST /login': async (request) => {
    const form = await request.formData();
    const username = String(form.get('username') ?? '');

    // Never trust the browser's validation: anyone can skip it.
    const error = validateUsername(username);
    if (error) {
      // 422 = "understood, but the data is invalid". The HX-* headers tell htmx to put
      // the message in the field's error slot instead of replacing #app.
      return htmlResponse(templates.fieldError(error), 422, {
        'HX-Retarget': '#username-error',
        'HX-Reswap': 'innerHTML',
      });
    }
    return htmlResponse(templates.chatScreen({ username }));
  },
};

self.addEventListener('install', () => self.skipWaiting());
// register.js asks for this whenever its page is uncontrolled (see there).
self.addEventListener('message', (event) => {
  if (event.data === 'claim') event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // CDN scripts etc. go to the network

  const route = routes[`${event.request.method} ${url.pathname}`];
  if (!route) return; // the request goes to the static file server as usual

  event.respondWith(
    delay(LATENCY_MS)
      .then(() => route(event.request))
      // A bug in the mock is a server error (500), not a network failure.
      .catch((error) => {
        console.error(error);
        return htmlResponse('Internal server error', 500);
      }),
  );
});

function validateUsername(username) {
  if (username.length < 3 || username.length > 20) return 'Username must be 3–20 characters.';
  if (!/^[A-Za-z0-9_]+$/.test(username)) return `"${username}" isn't allowed. Use only letters, numbers or _.`;
  return null;
}

function htmlResponse(body, status = 200, headers = {}) {
  return new Response(String(body), {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...headers },
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
