// Login screen. messenger-be has no /login, so nothing is sent: the username is checked
// here and only goes to the server inside each chat message.

const loginForm = document.querySelector('[data-login-form]');
const USERNAME_COOKIE = 'messenger_username';

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
  const username = input.value.trim();
  saveUsername(username);
  openChat(username);
});

function validateUsername(username) {
  if (username.length < 3 || username.length > 20) return 'Username must be 3–20 characters.';
  if (!/^[A-Za-z0-9_]+$/.test(username)) return `"${username}" isn't allowed. Use only letters, numbers or _.`;
  return null;
}

// htmx.process runs hx-ext="ws" on the new markup, which opens the socket.
function openChat(username) {
  saveUsername(username);
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

// Return directly to chat when this browser already has a valid username.
const savedUsername = loadUsername();

if (savedUsername && !validateUsername(savedUsername)) {
  openChat(savedUsername);
} else if (savedUsername) {
  clearUsername();
}

function saveUsername(username) {
  try {
    localStorage.setItem('username', username);
  } catch {}

  // Safari private browsing can reject localStorage. Keep a first-party cookie
  // as a fallback so the username survives a page refresh there as well.
  try {
    document.cookie = `${USERNAME_COOKIE}=${encodeURIComponent(username)}; Max-Age=31536000; Path=/; SameSite=Lax`;
  } catch {}
}

function loadUsername() {
  try {
    const stored = localStorage.getItem('username');
    if (stored) return stored;
  } catch {}

  try {
    const cookie = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith(`${USERNAME_COOKIE}=`));
    return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : null;
  } catch {
    return null;
  }
}

function clearUsername() {
  try {
    localStorage.removeItem('username');
  } catch {}
  try {
    document.cookie = `${USERNAME_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
  } catch {}
}
