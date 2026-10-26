# Messenger

A learning project for WebSockets: a chat frontend for [messenger-be](https://github.com/nikrontech/messenger-be) (Rust/axum).

Stack: HTMX 2 + `htmx-ext-ws`, plain HTML, Tailwind CSS (browser CDN build). No install, no build step.

## Run locally

1. Start the backend (needs Rust), from a messenger-be clone next to this repo:
   ```sh
   cd ../messenger-be && cargo run
   ```
2. Serve the frontend:
   ```sh
   python3 -m http.server 5173 -d public
   ```
3. Open http://localhost:5173, pick a username, chat. Open a second window with another username to see messages arrive.

The chat shows "Connected" when the socket is up. Without the backend it stays on "Connecting…" with Send disabled.

## Deploy (Docker)

nginx serves `public/` and proxies `/ws` to messenger-be, so the page and socket share one origin (https → `wss` automatically).

```sh
docker build -t messenger-fe .
docker run --rm -p 8080:80 -e BACKEND_URL=http://<backend-host>:3000 messenger-fe
```

- `BACKEND_URL`: scheme, host, port, no path. Default `http://host.docker.internal:3000` (backend on your machine).
- messenger-be binds `127.0.0.1`; to reach it from another container or host it must bind `0.0.0.0`.

## How it works

- **Login is client-side.** The backend has no `/login`; `js/login.js` validates the username (3–20 chars, `[A-Za-z0-9_]`) and opens the chat. The backend accepts any username, so anyone can post as anyone.
- **Socket URL** comes from `WS_URL` in `js/config.js`: `ws://127.0.0.1:3000/ws` locally, `/ws` in the Docker image (`docker/config.js`).
- **Protocol:** JSON text frames on `GET /ws`. The client sends `{"username", "message"}`; the server broadcasts the same JSON to every client, sender included. No history.
- Messages render via `textContent`, so markup shows as text.

## Structure

```
public/
├── index.html         app shell, login form, chat <template>
├── js/config.js       WS_URL
├── js/app.js          theme toggle, network error message
├── js/login.js        username check, opens the chat
├── js/chat.js         adapts htmx-ext-ws to the JSON protocol
└── mock-sw.js         kill switch for the old mock Service Worker; delete once unused
Dockerfile             nginx image
docker/
├── nginx.conf.template  site config; BACKEND_URL filled in at start
└── config.js          WS_URL = '/ws' for the image
```

## Checks

No package.json, lint or tests. Syntax check:

```sh
for f in public/js/*.js public/mock-sw.js docker/config.js; do node --check "$f"; done
```
