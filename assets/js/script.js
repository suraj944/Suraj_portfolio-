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
