// MOCK ONLY. Installs the fake backend (/mock-sw.js).
// When the real backend exists, delete this file and its <script> tag in index.html.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    // updateViaCache 'none': edits to /mock/templates.js reach the worker without waiting on the HTTP cache.
    .register('/mock-sw.js', { updateViaCache: 'none' })
    .then(() => navigator.serviceWorker.ready)
    // A first visit or a hard reload (Shift+Reload) leaves the page uncontrolled, so requests
    // would skip the mock and hit the static server. Ask the worker to take over this page.
    .then((registration) => {
      if (!navigator.serviceWorker.controller) registration.active.postMessage('claim');
    })
    .catch((error) => console.error('Mock backend not installed, so /login will fail.', error));
} else {
  console.error('Service workers need localhost or HTTPS. Mock backend not installed, so /login will fail.');
}
