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

// The real backend (messenger-be). It has no /login yet, so the mock still renders
// this screen, but messages go to the real server. Served from the same origin, the
// backend would render ws-connect="/ws" instead.
const CHAT_SOCKET_URL = 'ws://127.0.0.1:3000/ws';

const templates = {
  // Goes into #username-error (see HX-Retarget in mock-sw.js).
  fieldError: (message) => html`${message}`,

  // Messages arrive as JSON and js/chat.js renders them from <template data-chat-message-template>.
  chatScreen: ({ username }) => html`
    <section data-chat data-username="${username}" hx-ext="ws" ws-connect="${CHAT_SOCKET_URL}" aria-labelledby="chat-title"
             class="group/chat glass flex h-[min(44rem,calc(100dvh-8rem))] w-full flex-col overflow-hidden rounded-3xl">
      <header class="flex items-center justify-between gap-4 border-b border-slate-900/10 px-5 py-4 dark:border-white/10">
        <div class="min-w-0">
          <h1 id="chat-title" class="text-lg font-semibold tracking-tight">Chat</h1>
          <p class="truncate text-sm text-slate-600 dark:text-slate-300">Signed in as <strong class="font-semibold text-slate-900 dark:text-white">${username}</strong></p>
        </div>
        <p class="flex shrink-0 items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <span aria-hidden="true" class="size-2 rounded-full bg-amber-500 group-data-[status=open]/chat:bg-emerald-500"></span>
          <span data-chat-status role="status">Connecting…</span>
        </p>
      </header>

      <!-- role=log: screen readers announce new messages. tabindex: keyboard users can scroll it. -->
      <div data-chat-log role="log" aria-label="Messages" tabindex="0"
           class="group/log flex-1 overflow-y-auto px-4 py-5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 sm:px-5">
        <p class="grid h-full place-items-center text-center text-sm text-slate-600 group-has-[li]/log:hidden dark:text-slate-400">No messages yet. Say hi!</p>
        <ol data-chat-messages class="space-y-3"></ol>
      </div>

      <template data-chat-message-template>
        <li class="group/msg flex flex-col items-start data-mine:items-end">
          <span data-chat-author class="mb-1 px-1 text-xs font-medium text-slate-600 dark:text-slate-400"></span>
          <p data-chat-text class="max-w-[85%] rounded-2xl rounded-bl-md bg-white px-4 py-2 break-words whitespace-pre-wrap text-slate-900 shadow-sm group-data-mine/msg:rounded-br-md group-data-mine/msg:rounded-bl-2xl group-data-mine/msg:bg-indigo-600 group-data-mine/msg:text-white dark:bg-slate-800 dark:text-slate-100 dark:group-data-mine/msg:bg-indigo-500"></p>
        </li>
      </template>

      <form ws-send class="flex gap-2 border-t border-slate-900/10 p-3 dark:border-white/10">
        <label for="message" class="sr-only">Message</label>
        <input id="message" name="message" type="text" required maxlength="2000" autocomplete="off" autofocus
               placeholder="Write a message…"
               class="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white/80 px-4 py-3 text-base shadow-sm outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/25 dark:border-white/15 dark:bg-slate-950/50 dark:placeholder:text-slate-400 dark:focus:border-indigo-400">
        <!-- Enabled by js/chat.js once the socket is open. -->
        <button type="submit" data-chat-send disabled
                class="rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 px-5 font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:from-indigo-700 hover:to-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none dark:focus-visible:outline-indigo-400">
          Send
        </button>
      </form>
    </section>`,
};
