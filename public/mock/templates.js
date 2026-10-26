// HTML fragments the mock server sends back. The real backend must return the
// same markup (same ids, same structure), rendered by its own template engine.

// Escape by default: every ${value} inside html`` is escaped, so user text can
// never become tags. Only html`` results (or arrays of them) are inserted as-is.
// null, undefined and false render nothing, so ${cond && html`...`} works.
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);

class SafeHtml {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

function render(value) {
  if (value == null || value === false) return '';
  if (Array.isArray(value)) return value.map(render).join('');
  return value instanceof SafeHtml ? value.value : escapeHtml(value);
}

function html(strings, ...values) {
  const body = strings.reduce((out, string, i) => out + render(values[i - 1]) + string);
  return new SafeHtml(body);
}

const templates = {
  // Goes into #username-error (see HX-Retarget in mock-sw.js).
  fieldError: (message) => html`${message}`,

  // Placeholder until the chat screen is built.
  chatScreen: ({ username }) => html`
    <section class="glass w-full rounded-3xl p-6 text-center sm:p-10" aria-labelledby="chat-title">
      <h1 id="chat-title" tabindex="-1" autofocus class="text-2xl font-semibold tracking-tight outline-none">Welcome, ${username}</h1>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">You're in. The chat screen is the next step.</p>
    </section>`,
};
