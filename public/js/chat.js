// Chat over the backend WebSocket. htmx-ext-ws owns the connection (reconnect with
// backoff, form serialisation); this file adapts it to messenger-be, which speaks
// JSON {username, message} instead of HTML fragments. If the backend ever sends
// HTML fragments, delete the wsBeforeMessage handler and htmx-ext-ws swaps them itself.

const STATUS_TEXT = { open: 'Connected', closed: 'Reconnecting…' };

// Outgoing: send exactly {username, message}. htmx's default body adds a HEADERS object.
document.addEventListener('htmx:wsConfigSend', (event) => {
  const chat = event.target.closest('[data-chat]');
  if (!chat) return;
  const message = String(event.detail.parameters.message ?? '').trim();
  if (!message) {
    event.preventDefault();
    return;
  }
  event.detail.messageBody = JSON.stringify({ username: chat.dataset.username, message });
  event.target.reset();
});

// Incoming: the server broadcasts every message to everyone, the sender included.
document.addEventListener('htmx:wsBeforeMessage', (event) => {
  const chat = event.target.closest('[data-chat]');
  if (!chat) return;
  event.preventDefault(); // JSON, not a fragment: stop htmx-ext-ws from trying to swap it
  let data;
  try {
    data = JSON.parse(event.detail.message);
  } catch {
    return;
  }
  if (typeof data?.username === 'string' && typeof data.message === 'string') appendMessage(chat, data);
});

document.addEventListener('htmx:wsOpen', (event) => setStatus(event.target, 'open'));
document.addEventListener('htmx:wsClose', (event) => setStatus(event.target, 'closed'));

function appendMessage(chat, { username, message }) {
  const log = chat.querySelector('[data-chat-log]');
  const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  const mine = username === chat.dataset.username;
  const item = chat.querySelector('[data-chat-message-template]').content.firstElementChild.cloneNode(true);
  // textContent, never innerHTML: both values are user text.
  item.querySelector('[data-chat-author]').textContent = mine ? 'You' : username;
  item.querySelector('[data-chat-text]').textContent = message;
  item.toggleAttribute('data-mine', mine);
  log.querySelector('[data-chat-messages]').append(item);
  // Don't yank someone reading older messages down, unless they just sent one.
  if (mine || atBottom) log.scrollTop = log.scrollHeight;
}

function setStatus(element, state) {
  const chat = element.closest('[data-chat]');
  if (!chat || chat.dataset.status === state) return; // same text again would be re-announced
  chat.dataset.status = state;
  chat.querySelector('[data-chat-status]').textContent = STATUS_TEXT[state];
  chat.querySelector('[data-chat-send]').disabled = state !== 'open';
}
