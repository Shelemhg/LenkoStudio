/**
 * app.js
 *
 * Responsibilities:
 * - PJAX navigation (fast internal navigation without full reloads)
 * - Global audio preference + toggle wiring
 * - Page feature wiring (forms, portfolio modules)
 *
 * Non-goals:
 * - Running inline scripts from fetched pages (security + double-binding risk).
 */

(function () {
  'use strict';

  const AUDIO_ID = 'ambientAudio';
  const TOGGLE_ID = 'soundToggle';

  function $all(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function isSameOrigin(href) {
    try {
      const url = new URL(href, window.location.href);
      return url.origin === window.location.origin;
    } catch {
      return false;
    }
  }

  function isSamePageHashLink(href) {
    try {
      const url = new URL(href, window.location.href);
      const current = new URL(window.location.href);

      return Boolean(url.hash) && url.pathname === current.pathname && url.search === current.search;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------
  // Global Year Helper
  // ---------------------------------------------------------------------

  function updateYear(root = document) {
    const year = String(new Date().getFullYear());
    const yearEl = root.getElementById('year');

    if (yearEl) {
      yearEl.textContent = year;
    }
  }

  // ---------------------------------------------------------------------
  // Audio Controller
  // ---------------------------------------------------------------------

  const AudioController = (() => {
    let initialized = false;
    let fadeTimer = null;

    function getDefaultEnabled() {
      // Default behavior: desktop ON, mobile OFF.
      // We keep it intentionally simple and deterministic.
      return window.innerWidth > 768;
    }

    function getEnabled() {
      const saved = localStorage.getItem('soundEnabled');

      if (saved === null) {
        return getDefaultEnabled();
      }

      return saved === 'true';
    }

    function setEnabledPreference(enabled) {
      localStorage.setItem('soundEnabled', enabled ? 'true' : 'false');
    }

    function ensureAudioElement() {
      let audio = document.getElementById(AUDIO_ID);

      if (audio) {
        return audio;
      }

      audio = document.createElement('audio');
      audio.id = AUDIO_ID;
      audio.preload = 'none';
      audio.loop = true;

      const source = document.createElement('source');
      source.src = 'media/audio.mp3';
      source.type = 'audio/mpeg';

      audio.appendChild(source);
      document.body.appendChild(audio);

      return audio;
    }

    function updateToggleButton(enabled) {
      const button = document.getElementById(TOGGLE_ID);
      if (!button) {
        return;
      }

      const label = enabled ? 'Sound On' : 'Sound Off';
      button.textContent = label;
      button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      button.setAttribute('aria-label', label);
    }

    function fadeVolume(audio, target, ms = 350) {
      if (!audio) {
        return;
      }

      if (fadeTimer) {
        window.clearInterval(fadeTimer);
        fadeTimer = null;
      }

      const start = audio.volume;
      const steps = Math.max(1, Math.floor(ms / 50));
      let step = 0;

      fadeTimer = window.setInterval(() => {
        step += 1;

        const next = start + (target - start) * (step / steps);
        audio.volume = Math.max(0, Math.min(1, next));

        if (step >= steps) {
          window.clearInterval(fadeTimer);
          fadeTimer = null;

          if (target === 0) {
            audio.pause();
          }
        }
      }, 50);
    }

    function enable(enabled) {
      const audio = ensureAudioElement();
      setEnabledPreference(Boolean(enabled));

      updateToggleButton(Boolean(enabled));

      if (enabled) {
        // Start silent, then fade up.
        audio.volume = 0;

        try {
          audio.play();
        } catch {
          // Autoplay is often blocked; user gesture will fix it.
        }

        fadeVolume(audio, 1, 400);
        return;
      }

      fadeVolume(audio, 0, 400);
    }

    function bindToggleOnce() {
      const button = document.getElementById(TOGGLE_ID);
      if (!button) {
        return;
      }

      // Prevent duplicate bindings across PJAX navigations.
      if (button.dataset.audioBound === 'true') {
        return;
      }
      button.dataset.audioBound = 'true';

      // Set initial UI state.
      updateToggleButton(getEnabled());

      button.addEventListener('click', () => {
        const nextEnabled = button.getAttribute('aria-pressed') !== 'true';
        enable(nextEnabled);
      });
    }

    function init() {
      // PJAX re-calls initPageFeatures; keep this idempotent.
      if (initialized) {
        ensureAudioElement();
        bindToggleOnce();
        updateToggleButton(getEnabled());
        return;
      }

      initialized = true;
      ensureAudioElement();
      bindToggleOnce();

      // If the user preference is enabled, try to start audio.
      // If autoplay is blocked, it will start on first gesture.
      if (getEnabled()) {
        enable(true);
      } else {
        enable(false);
      }
    }

    return {
      init,
      enable,
      getEnabled,
      updateToggleButton
    };
  })();

  // Expose a minimal, stable API for page-specific modules (home.js, etc.).
  window.Lenko = window.Lenko || {};
  window.Lenko.audio = AudioController;

  // ---------------------------------------------------------------------
  // Page Features (Forms)
  // ---------------------------------------------------------------------

  function setFormStatus(root, elementId, message) {
    const el = root.getElementById(elementId);

    if (!el) {
      return;
    }

    el.textContent = message;
  }

  function initQuoteEstimator(root, config) {
    const form = root.getElementById(config.formId);
    if (!form) {
      return;
    }

    if (form.dataset.managed === 'true') {
      return;
    }
    form.dataset.managed = 'true';

    const hours = root.getElementById(config.hoursId);
    const locations = root.getElementById(config.locationsId);
    const deliverables = root.getElementById(config.deliverablesId);
    const out = root.getElementById(config.outputId);
    const email = root.getElementById(config.emailId);

    const base = 1200;
    const hourly = 1500;
    const perLocation = 800;
    const perDeliverable = 120;

    function price() {
      const h = Number(hours && hours.value);
      const l = Number(locations && locations.value);
      const d = Number(deliverables && deliverables.value);

      const total = base + h * hourly + Math.max(0, l - 1) * perLocation + d * perDeliverable;
      return Math.round(total / 50) * 50;
    }

    function update() {
      if (!out) {
        return;
      }

      out.textContent = `Estimated: MXN $${price().toLocaleString('en-US')}`;
    }

    [hours, locations, deliverables].forEach((input) => {
      if (!input) {
        return;
      }

      input.addEventListener('input', update);
    });

    update();

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const value = (email && email.value ? String(email.value).trim() : '');

      if (!value) {
        setFormStatus(root, config.statusId, 'Please enter an email address.');
        if (email) {
          email.focus();
        }
        return;
      }

      setFormStatus(root, config.statusId, 'Thanks! Your estimate has been recorded.');
    });
  }

  function initContactForm(root) {
    const form = root.getElementById('contactForm');
    if (!form) {
      return;
    }

    if (form.dataset.managed === 'true') {
      return;
    }
    form.dataset.managed = 'true';

    const downloadButton = root.getElementById('downloadSubmissions');
    const status = root.getElementById('contactStatus');

    function setStatus(message) {
      if (!status) {
        return;
      }

      status.textContent = message;
    }

    function saveSubmission(obj) {
      try {
        const key = 'contactSubmissions';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push({ ...obj, ts: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(existing));
      } catch {
        // If storage fails (disabled/quota), we still allow mailto.
      }
    }

    function makeMailtoUrl(obj) {
      const to = 'support@lenkostudio.com';
      const subject = encodeURIComponent(`Lenko Studio Contact: ${obj.name}`);
      const body = encodeURIComponent(`Name: ${obj.name}\nEmail: ${obj.email}\nMessage:\n${obj.message || ''}`);

      return `mailto:${to}?subject=${subject}&body=${body}`;
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const data = new FormData(form);

      const obj = {
        name: String(data.get('name') || '').trim(),
        email: String(data.get('email') || '').trim(),
        message: String(data.get('message') || '').trim()
      };

      if (!obj.name || !obj.email) {
        setStatus('Please provide your name and email.');
        return;
      }

      saveSubmission(obj);
      setStatus('Opening your email client…');

      // Keep the existing intended behavior (mailto workflow).
      window.location.href = makeMailtoUrl(obj);

      // Reset the form after we trigger the mail client.
      form.reset();
    });

    if (downloadButton) {
      downloadButton.addEventListener('click', () => {
        try {
          const key = 'contactSubmissions';
          const arr = JSON.parse(localStorage.getItem(key) || '[]');

          if (!Array.isArray(arr) || arr.length === 0) {
            setStatus('Nothing saved yet. Submit the form first.');
            return;
          }

          const blob = new Blob([JSON.stringify(arr, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);

          const a = document.createElement('a');
          a.href = url;
          a.download = 'lenko-contact-submissions.json';

          document.body.appendChild(a);
          a.click();
          a.remove();

          URL.revokeObjectURL(url);
          setStatus('Downloaded saved submissions.');
        } catch {
          setStatus('Unable to download submissions on this device.');
        }
      });
    }
  }

  function initPageFeatures(root = document) {
    updateYear(root);

    // Ensure the audio toggle always works (header is shared across pages).
    AudioController.init();

    // Quote estimator forms (two variants exist in the repo).
    initQuoteEstimator(root, {
      formId: 'estimator2',
      hoursId: 'hours2',
      locationsId: 'locations2',
      deliverablesId: 'deliverables2',
      outputId: 'estimateText2',
      emailId: 'email2',
      statusId: 'estimateStatus2'
    });

    initQuoteEstimator(root, {
      formId: 'estimator',
      hoursId: 'hours',
      locationsId: 'locations',
      deliverablesId: 'deliverables',
      outputId: 'estimateText',
      emailId: 'email',
      statusId: 'estimateStatus'
    });

    initContactForm(root);

    // Portfolio modules must be refreshable after PJAX swaps `#main`.
    if (window.PortfolioParallax && typeof window.PortfolioParallax.init === 'function') {
      window.PortfolioParallax.init();
    }

    if (window.SphereGallery && typeof window.SphereGallery.init === 'function') {
      window.SphereGallery.init();
    }

    // Home intro controller (idempotent, no-op on non-home pages).
    if (window.HomeIntro && typeof window.HomeIntro.init === 'function') {
      window.HomeIntro.init();
    }
  }

  // ---------------------------------------------------------------------
  // Navigation State (`aria-current`)
  // ---------------------------------------------------------------------

  function updateAriaCurrent(url) {
    const normalizedPath = new URL(url, window.location.href).pathname.replace(/\/index\.html$/, '/');

    $all('.site-nav a').forEach((a) => {
      const href = a.getAttribute('href');
      if (!href) {
        return;
      }

      // External links should never be marked current.
      if (!isSameOrigin(href)) {
        a.removeAttribute('aria-current');
        return;
      }

      const aPath = new URL(href, window.location.href).pathname.replace(/\/index\.html$/, '/');
      if (aPath === normalizedPath) {
        a.setAttribute('aria-current', 'page');
      } else {
        a.removeAttribute('aria-current');
      }
    });
  }

  // ---------------------------------------------------------------------
  // PJAX
  // ---------------------------------------------------------------------

  async function loadPage(url, replaceState) {
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // 1) Stylesheets: add missing, remove previously injected ones that are no longer needed.
      const nextLinks = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
      const requiredStyles = new Set(
        nextLinks
          .map((l) => l.getAttribute('href'))
          .filter(Boolean)
          .map((href) => new URL(href, url).href)
      );

      $all('link[rel="stylesheet"][data-pjax-added]').forEach((link) => {
        if (!requiredStyles.has(link.href)) {
          link.remove();
        }
      });

      const currentStyles = new Set($all('link[rel="stylesheet"]').map((l) => l.href));
      requiredStyles.forEach((href) => {
        if (currentStyles.has(href)) {
          return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.setAttribute('data-pjax-added', '');
        document.head.appendChild(link);
      });

      // 2) Inline <style> tags from the fetched page head.
      // We only keep the newest set to avoid CSS accumulation across navigations.
      $all('style[data-pjax-style]', document.head).forEach((s) => s.remove());
      Array.from(doc.head ? doc.head.querySelectorAll('style') : []).forEach((styleEl) => {
        const text = String(styleEl.textContent || '').trim();
        if (!text) {
          return;
        }

        const s = document.createElement('style');
        s.setAttribute('data-pjax-style', '');
        s.textContent = text;
        document.head.appendChild(s);
      });

      // 3) Swap #main
      const newMain = doc.querySelector('#main');
      const curMain = document.getElementById('main');

      if (!newMain || !curMain) {
        window.location.href = url;
        return;
      }

      curMain.replaceWith(newMain);

      // 4) Title + nav state
      document.title = doc.title || document.title;
      updateAriaCurrent(url);

      if (!replaceState) {
        window.history.pushState({}, '', url);
      }

      window.scrollTo(0, 0);

      // 5) External scripts
      // We never execute inline scripts from fetched pages.
      const requiredScriptSrcs = Array.from(doc.querySelectorAll('script[src]'))
        .map((s) => s.getAttribute('src'))
        .filter(Boolean)
        .map((src) => new URL(src, url).href)
        .filter((src) => !src.includes('/app.js'));

      // Remove previously injected scripts that are no longer required.
      $all('script[data-pjax-added]').forEach((s) => {
        if (!requiredScriptSrcs.includes(s.src)) {
          s.remove();
        }
      });

      const currentScripts = new Set($all('script[src]').map((s) => s.src));
      const toAdd = requiredScriptSrcs.filter((src) => !currentScripts.has(src));

      for (const src of toAdd) {
        // Load sequentially to preserve ordering.
        // (Portfolio modules can depend on each other.)
        await new Promise((resolve) => {
          const s = document.createElement('script');
          s.src = src;
          s.defer = true;
          s.setAttribute('data-pjax-added', '');
          s.onload = () => resolve();
          s.onerror = () => resolve();
          document.body.appendChild(s);
        });
      }

      // 6) Re-bind page features to the new DOM.
      initPageFeatures(document);
    } catch (err) {
      console.error('PJAX Error:', err);
      window.location.href = url;
    }
  }

  document.addEventListener(
    'click',
    (event) => {
      const a = event.target && event.target.closest ? event.target.closest('a') : null;
      if (!a) {
        return;
      }

      const href = a.getAttribute('href');
      if (!href) {
        return;
      }

      // Let the browser handle in-page anchors.
      if (href.startsWith('#') || isSamePageHashLink(href)) {
        return;
      }

      // Do not hijack:
      // - new tab
      // - downloads
      // - modified clicks
      if (a.target === '_blank' || a.hasAttribute('download')) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      if (!isSameOrigin(href)) {
        return;
      }

      event.preventDefault();
      loadPage(href, false);
    },
    { capture: true }
  );

  window.addEventListener('popstate', () => {
    loadPage(window.location.href, true);
  });

  // Initial page load.
  initPageFeatures(document);
})();
