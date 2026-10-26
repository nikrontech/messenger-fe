// Shared UI behaviour for every screen. Nothing here knows about the mock.

const root = document.documentElement;
const themeToggle = document.querySelector('[data-theme-toggle]');
const appError = document.getElementById('app-error');

// Theme: the inline script in <head> already applied the saved/OS theme.
// The toggle saves an explicit choice; until there is one, the page follows the OS live.
function applyTheme(dark) {
  root.classList.toggle('dark', dark);
  themeToggle.setAttribute('aria-pressed', dark);
}

applyTheme(root.classList.contains('dark'));
themeToggle.addEventListener('click', () => {
  const dark = !root.classList.contains('dark');
  applyTheme(dark);
  try {
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  } catch {}
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
  let saved = null;
  try {
    saved = localStorage.getItem('theme');
  } catch {}
  if (!saved) applyTheme(event.matches);
});

// Server unreachable or an unexpected error status: say so instead of failing silently.
// 422 is not an error here; htmx-config swaps it into the form like a normal response.
document.addEventListener('htmx:beforeRequest', () => showError(''));
document.addEventListener('htmx:sendError', () => showError("Can't reach the server. Check your connection and try again."));
document.addEventListener('htmx:responseError', (event) => showError(`Request failed (${event.detail.xhr.status}). Try again.`));

function showError(message) {
  appError.textContent = message;
}
