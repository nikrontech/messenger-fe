# Messenger

A learning project for getting to know sockets and how the frontend talks to the backend.

Stack: HTMX 2 + plain HTML, Tailwind CSS (browser CDN build), `htmx-ext-ws` for real-time messages, Alpine.js only if needed.

Backend: [messenger-be](https://github.com/nikrontech/messenger-be) (Rust/axum). It only has the chat WebSocket so far, so `/login` is still answered by a mock in the browser.

## Run

No install and no build step for the frontend. Needs Python 3 (or any static file server) and internet access, because htmx and Tailwind load from jsDelivr. The chat needs the backend, which needs Rust (`brew install rust` or https://rustup.rs).

0. Start the backend, from a clone of messenger-be next to this repo. It keeps running:
   ```sh
   cd ../messenger-be && cargo run
   ```
   Ready when it prints `WebSocket server listening at ws://127.0.0.1:3000/ws`. Without it, login still works but the chat stays on "Reconnecting…" with Send disabled.
1. Start the frontend server from this repo's root. It keeps running, so start it in the background:
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
| Chat screen opens | Status goes from "Connecting…" to "Connected" and Send is enabled |
| Two windows, two usernames, send from one | The message shows in both: on the right as "You" in the sender's, on the left with the name in the other |
| Send `<b>hi</b>` | Shown as literal text, not bold |
| Stop the backend | Status "Reconnecting…", Send disabled. Restart it: back to "Connected" within about a minute (retries back off up to 64 s) |

### Notes for agents

- **The WebSocket is never mocked.** Service workers can't intercept WebSockets, so the chat always talks to `ws://127.0.0.1:3000/ws` (set in `mock/templates.js`). Test it with two browser contexts logged in as different users.
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
├── js/chat.js         chat: adapts htmx-ext-ws to the backend's JSON messages
├── mock-sw.js         MOCK: fake backend (Service Worker), must sit at the web root
└── mock/
    ├── register.js    MOCK: installs mock-sw.js
    └── templates.js   MOCK: HTML fragments (login error, chat screen) + auto-escaping html`` helper
```

## Server contract

The mock and the real backend must both honour this. Requests are form-encoded; responses are HTML fragments.

| Request | Response |
|---|---|
| `POST /login` `username` | `200` chat screen fragment, swapped into `#app` |
| | `422` error text + `HX-Retarget: #username-error`, `HX-Reswap: innerHTML` |

Username rule: 3–20 characters, `[A-Za-z0-9_]`. The server validates it again; browser validation is only for UX.

WebSocket `GET /ws` (real backend, JSON text frames both ways):

| Direction | Frame |
|---|---|
| Client → server | `{"username": "ada_lovelace", "message": "hi"}` |
| Server → every client, sender included | the same JSON. The page marks it as "You" when `username` matches its own. |

The server sends JSON, not HTML, so `js/chat.js` renders each message from the `<template data-chat-message-template>` in the chat fragment, using `textContent`. There is no history: a client only sees messages sent while it's connected.

## Swapping the mock for a real backend

1. Delete `public/mock/` and the `/mock/register.js` script tag in `index.html`.
2. Serve `public/` from the backend and implement the contract above. The chat fragment the backend renders uses `ws-connect="/ws"` (same origin) instead of the hard-coded `ws://127.0.0.1:3000/ws`.
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
