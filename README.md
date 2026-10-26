# Messenger

A learning project for getting to know sockets and how the frontend talks to the backend.

Stack: HTMX 2 + plain HTML, Tailwind CSS (browser CDN build), Alpine.js only if needed.
Later: `htmx-ext-ws` for real-time messages.

## Run

No install and no build step. Needs Python 3 (or any static file server) and internet access, because htmx and Tailwind load from jsDelivr.

1. Start the server from the repo root. It keeps running, so start it in the background:
   ```sh
   python3 -m http.server 5173 -d public
   ```
   If port 5173 is taken (`lsof -nP -iTCP:5173 -sTCP:LISTEN`), use another port.
2. Check it serves: `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5173/` prints `200`.
3. Open http://localhost:5173 in a browser. It must be `localhost` or HTTPS: service workers don't run on `file://` or LAN IPs, and without the worker `/login` has no backend.
4. Stop: `Ctrl+C`, or kill the background process.

### What working looks like

| Action | Expected |
|---|---|
| Type `ada_lovelace`, click **Join** | After ~400 ms the card becomes "Welcome, ada_lovelace" |
| Type `ab`, click **Join** | Browser validation blocks it; no request is sent |
| Remove the input's `pattern` in DevTools, submit `<b>hi</b>` | Red field error showing the literal text `<b>hi</b>`; input gets `aria-invalid="true"` |
| DevTools → Network → `/login` | Size column says `(ServiceWorker)` |

### Notes for agents

- **Don't test `/login` with curl.** curl skips the browser, so the mock never sees the request and Python answers `501`. Drive a real browser instead (e.g. Playwright with Chrome), and wait for `navigator.serviceWorker.controller !== null` before submitting.
- **"Request failed (501)" in the page** means the worker wasn't controlling it yet. `mock/register.js` asks it to take over; reload once if it persists.
- **After editing `public/mock/*` or `mock-sw.js`**, use a fresh browser context, or tick DevTools → Application → Service workers → "Update on reload". An installed worker can keep running old code.
- **Checks:** there's no `package.json`, typecheck, lint or test suite. Syntax-check the JS with:
  ```sh
  for f in public/js/app.js public/mock-sw.js public/mock/*.js; do node --check "$f"; done
  ```

## Structure

```
public/                web root: everything the browser loads
├── index.html         app shell + login screen; every screen swaps into #app
├── js/app.js          shared UI: theme toggle, network error message
├── mock-sw.js         MOCK: fake backend (Service Worker), must sit at the web root
└── mock/
    ├── register.js    MOCK: installs mock-sw.js
    └── templates.js   MOCK: HTML fragments + auto-escaping html`` helper
```

## Server contract

The mock and the real backend must both honour this. Requests are form-encoded; responses are HTML fragments.

| Request | Response |
|---|---|
| `POST /login` `username` | `200` chat screen fragment, swapped into `#app` |
| | `422` error text + `HX-Retarget: #username-error`, `HX-Reswap: innerHTML` |

Username rule: 3–20 characters, `[A-Za-z0-9_]`. The server validates it again; browser validation is only for UX.

## Swapping the mock for a real backend

1. Delete `public/mock/` and the `/mock/register.js` script tag in `index.html`.
2. Serve `public/` from the backend and implement the contract above.
3. Replace `public/mock-sw.js` with this kill switch instead of deleting it. A browser that ran the mock keeps the old worker even when the file returns 404, and that worker keeps answering `/login`. On the next visit the browser fetches the new file, which removes the mock and reloads the page:

   ```js
   self.addEventListener('install', () => self.skipWaiting());
   self.addEventListener('activate', (event) => event.waitUntil(
     self.registration.unregister()
       .then(() => self.clients.matchAll())
       .then((clients) => Promise.all(clients.map((client) => client.navigate(client.url)))),
   ));
   ```

   Delete it once no one has visited with the mock for a while.
