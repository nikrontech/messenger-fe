// Login screen. messenger-be has no /login, so nothing is sent: the username is checked
// here and only goes to the server inside each chat message.

const loginForm = document.querySelector('[data-login-form]');

// Fires only after the browser's own validation (required, minlength, pattern) passes.
loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const input = loginForm.elements.username;
  // Those attributes can be removed in DevTools, and the backend accepts any username, so check again.
  const error = validateUsername(input.value);
  if (error) {
    input.setAttribute('aria-invalid', 'true');
    document.getElementById('username-error').textContent = error;
    input.focus();
    return;
  }
  openChat(input.value);
});

function validateUsername(username) {
  if (username.length < 3 || username.length > 20) return 'Username must be 3–20 characters.';
  if (!/^[A-Za-z0-9_]+$/.test(username)) return `"${username}" isn't allowed. Use only letters, numbers or _.`;
  return null;
}

// htmx.process runs hx-ext="ws" on the new markup, which opens the socket.
function openChat(username) {
  const screen = document.getElementById('chat-screen').content.cloneNode(true);
  const chat = screen.querySelector('[data-chat]');
  chat.setAttribute('ws-connect', WS_URL);
  chat.dataset.username = username;
  chat.querySelector('[data-chat-username]').textContent = username;
  const app = document.getElementById('app');
  app.replaceChildren(screen);
  htmx.process(app);
  app.querySelector('[autofocus]').focus();
}
