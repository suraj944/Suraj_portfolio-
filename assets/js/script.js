'use strict';

/* ---------- Section navigation ----------
   Each tab links to its section by id (#about, #resume, #contact),
   so tabs and pages are matched by name, not by position. Links work
   without JavaScript, can be bookmarked, and the Back button works. */
(function initTabs() {
  const tabs = Array.from(document.querySelectorAll('[data-tab]'));
  const pages = Array.from(document.querySelectorAll('[data-page]'));
  const main = document.getElementById('main');
  if (!tabs.length || !pages.length) return;

  const names = pages.map((p) => p.dataset.page);
  const fallback = names[0];

  function show(name, { focus = false } = {}) {
    if (!names.includes(name)) name = fallback;

    pages.forEach((page) => {
      const active = page.dataset.page === name;
      page.hidden = !active;
      page.classList.toggle('is-active', active);
    });

    tabs.forEach((tab) => {
      if (tab.dataset.tab === name) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });

    if (focus && main) {
      main.focus({ preventScroll: true });
      const top = main.getBoundingClientRect().top + window.scrollY - 80;
      if (window.scrollY > top) window.scrollTo({ top: Math.max(0, top) });
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', (event) => {
      event.preventDefault();
      const name = tab.dataset.tab;
      if (location.hash !== '#' + name) history.pushState(null, '', '#' + name);
      show(name, { focus: true });
    });
  });

  window.addEventListener('popstate', () => show(location.hash.slice(1)));
  window.addEventListener('hashchange', () => show(location.hash.slice(1)));

  show(location.hash.slice(1));
})();

/* ---------- Contact details toggle (small screens) ---------- */
(function initContactsToggle() {
  const toggle = document.querySelector('[data-contacts-toggle]');
  const panel = document.querySelector('[data-contacts]');
  if (!toggle || !panel) return;

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    panel.classList.toggle('is-open', open);
  });
})();

/* ---------- Contact form ----------
   Validates fields with clear messages, then sends through FormSubmit's
   AJAX endpoint so the visitor stays on the page and sees the result.
   If JavaScript is off, the form still posts normally to FormSubmit. */
(function initContactForm() {
  const form = document.querySelector('[data-form]');
  if (!form) return;

  const button = form.querySelector('[data-form-btn]');
  const label = form.querySelector('[data-form-btn-label]');
  const status = form.querySelector('[data-form-status]');
  const fields = Array.from(form.querySelectorAll('input[required], textarea[required]'));
  const endpoint = form.action.replace('formsubmit.co/', 'formsubmit.co/ajax/');
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function errorFor(input) {
    const value = input.value.trim();
    const name = input.labels && input.labels[0] ? input.labels[0].textContent.trim() : 'This field';
    if (!value) return name + ' is required.';
    if (input.type === 'email' && !EMAIL_RE.test(value)) return 'Enter a valid email address, like name@example.com.';
    if (input.minLength > 0 && value.length < input.minLength) return name + ' should be at least ' + input.minLength + ' characters.';
    return '';
  }

  function setError(input, message) {
    const field = input.closest('.field');
    const slot = document.getElementById(input.getAttribute('aria-describedby'));
    if (field) field.classList.toggle('has-error', Boolean(message));
    if (slot) slot.textContent = message;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  function setStatus(kind, message) {
    status.className = 'form-status' + (kind ? ' is-' + kind : '');
    status.textContent = '';
    if (!message) return;
    const icon = kind === 'success' ? 'i-check' : 'i-alert';
    status.insertAdjacentHTML('afterbegin', '<svg class="icon" aria-hidden="true"><use href="#' + icon + '"/></svg>');
    const text = document.createElement('span');
    text.textContent = message;
    status.appendChild(text);
  }

  function setBusy(busy) {
    button.disabled = busy;
    button.setAttribute('aria-busy', String(busy));
    label.textContent = busy ? 'Sending…' : 'Send message';
  }

  // Validate a field once the visitor leaves it, then live while they fix it.
  fields.forEach((input) => {
    input.addEventListener('blur', () => {
      if (input.value.trim()) setError(input, errorFor(input));
    });
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') setError(input, errorFor(input));
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('', '');

    let firstInvalid = null;
    fields.forEach((input) => {
      const message = errorFor(input);
      setError(input, message);
      if (message && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    if (!navigator.onLine) {
      setStatus('error', "You appear to be offline. Check your connection and try again.");
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    if (data._honey) return; // filled only by bots

    setBusy(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => ({}));
      const ok = response.ok && String(result.success) === 'true';

      if (ok) {
        form.reset();
        fields.forEach((input) => setError(input, ''));
        setStatus('success', "Thanks! Your message has been sent. I'll reply by email soon.");
      } else {
        const reason = result && result.message ? ' (' + result.message + ')' : '';
        setStatus('error', 'Your message could not be sent' + reason + '. Please try again, or email surajsingh511921@gmail.com directly.');
      }
    } catch (err) {
      const timedOut = err && err.name === 'AbortError';
      setStatus('error', (timedOut ? 'The request timed out.' : 'Something went wrong while sending.') +
        ' Please try again, or email surajsingh511921@gmail.com directly.');
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  });
})();

/* ---------- Footer year ---------- */
(function initYear() {
  const el = document.querySelector('[data-year]');
  if (el) el.textContent = String(new Date().getFullYear());
})();

/* ---------- Projects ----------
   Lists public, non-fork repositories from GitHub's public API.
   Loads the first time the Projects tab is opened, caches for 10 minutes,
   and shows loading, empty, error and rate-limit states. */
(function initProjects() {
  const USER = 'suraj944';
  const API = 'https://api.github.com/users/' + USER + '/repos?per_page=100&sort=pushed';
  const PROFILE = 'https://github.com/' + USER;
  const CACHE_KEY = 'projects:' + USER;
  const CACHE_MS = 10 * 60 * 1000;

  const page = document.querySelector('[data-page="projects"]');
  const grid = document.querySelector('[data-projects]');
  const status = document.querySelector('[data-projects-status]');
  const filterBar = document.querySelector('[data-project-filters]');
  if (!page || !grid || !status || !filterBar) return;

  const skeleton = grid.innerHTML;
  let repos = null;
  let loading = false;
  let activeLang = 'All';

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (u) => { try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : ''; } catch { return ''; } };
  const prettyName = (n) => { const t = n.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim(); return t.charAt(0).toUpperCase() + t.slice(1); };
  const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
  const icon = (id) => '<svg class="icon" aria-hidden="true"><use href="#' + id + '"/></svg>';

  function showStatus(iconId, message, action) {
    grid.innerHTML = '';
    grid.setAttribute('aria-busy', 'false');
    status.innerHTML = icon(iconId) + '<p>' + message + '</p>' + (action || '');
  }

  function render() {
    const list = activeLang === 'All' ? repos : repos.filter((r) => (r.language || 'Other') === activeLang);
    status.innerHTML = '';
    grid.setAttribute('aria-busy', 'false');
    grid.innerHTML = list.map((r) => {
      const desc = r.description ? esc(r.description) : 'No description yet.';
      const live = safeUrl(r.homepage);
      const code = safeUrl(r.html_url);
      return '<li class="card project">' +
        '<div class="project-head"><span class="project-icon" aria-hidden="true">' + icon('i-folder') + '</span>' +
        '<h3 class="project-title">' + esc(prettyName(r.name)) + '</h3></div>' +
        '<p class="project-desc' + (r.description ? '' : ' is-empty') + '">' + desc + '</p>' +
        '<div class="project-meta">' +
          (r.language ? '<span class="lang">' + esc(r.language) + '</span>' : '') +
          '<span>Updated ' + esc(fmtDate(r.pushed_at)) + '</span>' +
          (r.stargazers_count > 0 ? '<span class="stars">' + icon('i-star') + r.stargazers_count + '<span class="visually-hidden"> stars</span></span>' : '') +
        '</div>' +
        (code || live ? '<div class="project-links">' +
          (code ? '<a href="' + esc(code) + '" target="_blank" rel="noopener">' + icon('i-code') + 'Code<span class="visually-hidden"> for ' + esc(prettyName(r.name)) + '</span></a>' : '') +
          (live ? '<a href="' + esc(live) + '" target="_blank" rel="noopener">' + icon('i-external') + 'Live site<span class="visually-hidden"> for ' + esc(prettyName(r.name)) + '</span></a>' : '') +
        '</div>' : '') + '</li>';
    }).join('');
  }

  function renderFilters() {
    const langs = Array.from(new Set(repos.map((r) => r.language || 'Other'))).sort();
    if (langs.length < 2) { filterBar.hidden = true; return; }
    filterBar.hidden = false;
    filterBar.innerHTML = ['All'].concat(langs).map((l) =>
      '<button type="button" class="filter" aria-pressed="' + (l === activeLang) + '" data-lang="' + esc(l) + '">' + esc(l) + '</button>').join('');
  }

  filterBar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lang]');
    if (!btn) return;
    activeLang = btn.dataset.lang;
    filterBar.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    render();
  });

  function readCache() {
    try {
      const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      return c && Date.now() - c.t < CACHE_MS ? c.data : null;
    } catch { return null; }
  }
  function writeCache(data) {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data })); } catch { /* storage unavailable */ }
  }

  const retryBtn = '<button type="button" class="btn btn-secondary" data-projects-retry>Try again</button>';
  const profileLink = '<a class="btn btn-secondary" href="' + PROFILE + '" target="_blank" rel="noopener">' + icon('i-external') + 'View GitHub profile</a>';

  async function load() {
    if (loading || repos) return;
    const cached = readCache();
    if (cached) { repos = cached; renderFilters(); render(); return; }

    loading = true;
    status.innerHTML = '';
    grid.innerHTML = skeleton;
    grid.setAttribute('aria-busy', 'true');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(API, { headers: { Accept: 'application/vnd.github+json' }, signal: controller.signal });
      if (res.status === 403 || res.status === 429) {
        const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000;
        const when = reset ? ' after ' + new Date(reset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ' later';
        showStatus('i-alert', 'GitHub is limiting requests right now. Please try again' + when + ', or browse the projects on GitHub.', profileLink);
        return;
      }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Unexpected response');

      repos = data
        .filter((r) => !r.fork && !r.archived && !r.private)
        .map((r) => ({ name: r.name, description: r.description, language: r.language, html_url: r.html_url,
                       homepage: r.homepage, stargazers_count: r.stargazers_count, pushed_at: r.pushed_at }));
      writeCache(repos);

      if (!repos.length) {
        showStatus('i-folder', 'No public projects yet. New work will appear here as soon as it is published on GitHub.', profileLink);
        return;
      }
      renderFilters();
      render();
    } catch (err) {
      repos = null;
      const msg = err && err.name === 'AbortError' ? 'Loading projects took too long.' : 'Projects could not be loaded.';
      showStatus('i-alert', msg + ' Check your connection and try again.', retryBtn + profileLink);
    } finally {
      clearTimeout(timer);
      loading = false;
    }
  }

  status.addEventListener('click', (e) => { if (e.target.closest('[data-projects-retry]')) load(); });

  // Load when the Projects section becomes visible (tab click, deep link or Back button).
  new MutationObserver(() => { if (!page.hidden) load(); }).observe(page, { attributes: true, attributeFilter: ['hidden'] });
  if (!page.hidden) load();
})();
