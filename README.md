# Messenger

A learning project for getting to know sockets and how the frontend talks to the backend.

Stack: HTMX 2 + plain HTML, Tailwind CSS (browser CDN build), `htmx-ext-ws` for real-time messages, Alpine.js only if needed.

Backend: [messenger-be](https://github.com/nikrontech/messenger-be) (Rust/axum). It only has the chat WebSocket (`ws://127.0.0.1:3000/ws`), so there's no login request: the page checks the username itself and sends it with every message.

## Run

No install and no build step for the frontend. Needs Python 3 (or any static file server) and internet access, because htmx and Tailwind load from jsDelivr. The chat needs the backend, which needs Rust (`brew install rust` or https://rustup.rs).

0. Start the backend, from a clone of messenger-be next to this repo. It keeps running:
   ```sh
   cd ../messenger-be && cargo run
   ```
   Ready when it prints `WebSocket server listening at ws://127.0.0.1:3000/ws`. Without it, login still works but the chat stays on "Connecting…"/"Reconnecting…" with Send disabled.
1. Start the frontend server from this repo's root. It keeps running, so start it in the background:
   ```sh
   python3 -m http.server 5173 -d public
   ```
   If port 5173 is taken (`lsof -nP -iTCP:5173 -sTCP:LISTEN`), use another port.
2. Check it serves: `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5173/` prints `200`.
3. Open http://localhost:5173 in a browser.
4. Stop: `Ctrl+C`, or kill the background process.

### What working looks like

| Action | Expected |
|---|---|
| Type `ada_lovelace`, click **Join** | The chat screen opens at once: "Signed in as ada_lovelace" |
| Type `ab`, click **Join** | Browser validation blocks it; no request is sent |
| Remove the input's `pattern` in DevTools, submit `<b>hi</b>` | Red field error showing the literal text `<b>hi</b>`; input gets `aria-invalid="true"` |
| DevTools → Network | No `/login` request; one WebSocket to `127.0.0.1:3000/ws` |
| Chat screen opens | Status goes from "Connecting…" to "Connected" and Send is enabled |
| Two windows, two usernames, send from one | The message shows in both: on the right as "You" in the sender's, on the left with the name in the other |
| Send `<b>hi</b>` | Shown as literal text, not bold |
| Stop the backend | Status "Reconnecting…", Send disabled. Restart it: back to "Connected" within about a minute (retries back off up to 64 s) |

### Notes for agents

- **No mocks.** The chat talks to `ws://127.0.0.1:3000/ws` (`ws-connect` in `index.html`'s `<template id="chat-screen">`). Test it with two browser contexts logged in as different users.
- **Login is client-side.** `js/login.js` validates the username and swaps the chat template into `#app`; nothing goes over HTTP.
- **Checks:** there's no `package.json`, typecheck, lint or test suite. Syntax-check the JS with:
  ```sh
  for f in public/js/*.js public/mock-sw.js; do node --check "$f"; done
  ```

## Structure

```
public/                web root: everything the browser loads
├── index.html         app shell, login screen, chat screen <template>; every screen goes into #app
├── js/app.js          shared UI: theme toggle, network error message
├── js/login.js        login: validates the username, opens the chat screen
├── js/chat.js         chat: adapts htmx-ext-ws to the backend's JSON messages
└── mock-sw.js         kill switch: removes the old mock Service Worker from browsers that ran it
```

## Server contract

WebSocket `GET /ws` on messenger-be (JSON text frames both ways):

| Direction | Frame |
|---|---|
| Client → server | `{"username": "ada_lovelace", "message": "hi"}` |
| Server → every client, sender included | the same JSON. The page marks it as "You" when `username` matches its own. |

The server sends JSON, not HTML, so `js/chat.js` renders each message from the `<template data-chat-message-template>` in the chat screen, using `textContent`. There is no history: a client only sees messages sent while it's connected.

Username rule: 3–20 characters, `[A-Za-z0-9_]`. Only the browser checks it: the backend accepts any `username`, so anyone can post as anyone.

## Old mock

Earlier versions answered `/login` with a Service Worker. A browser that ran it keeps it even after the file is gone, so `public/mock-sw.js` is now a kill switch: on the next visit it unregisters itself and reloads the page. Delete it once no one has visited with the mock for a while.
