// nav.js
// Wires up mobile navigation behavior for the server-injected nav partial.
// This replaces the old client-rendered header/footer approach.
//
// IMPORTANT:
// - Markup is injected server-side by _worker.js from components/nav.html
// - This script only attaches event listeners and manages ARIA + focus.

(function () {
  'use strict';

  function $all(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function init(root = document) {
    const menuToggle = root.querySelector('.menu-toggle');
    const nav = root.querySelector('.site-nav');
    const overlay = root.querySelector('.menu-overlay');

    if (!menuToggle || !nav || !overlay) {
      return;
    }

    // Prevent duplicate bindings (important for PJAX).
    if (menuToggle.dataset.navBound === 'true') {
      return;
    }
    menuToggle.dataset.navBound = 'true';

    const getFocusableLinks = () => Array.from(nav.querySelectorAll('a'));

    function setNavFocusable(enabled) {
      const links = getFocusableLinks();

      links.forEach((a) => {
        if (enabled) {
          const prev = a.getAttribute('data-prev-tabindex');
          if (prev !== null) {
            a.setAttribute('tabindex', prev);
            a.removeAttribute('data-prev-tabindex');
          } else {
            a.removeAttribute('tabindex');
          }
          return;
        }

        const current = a.getAttribute('tabindex');
        if (current !== null) {
          a.setAttribute('data-prev-tabindex', current);
        }
        a.setAttribute('tabindex', '-1');
      });

      try {
        if (!enabled) {
          nav.setAttribute('inert', '');
        } else {
          nav.removeAttribute('inert');
        }
      } catch {
        // inert not supported
      }
    }

    const closeMenu = (restoreFocus = true) => {
      nav.classList.remove('is-open');
      nav.setAttribute('aria-hidden', 'true');
      overlay.classList.remove('is-visible');
      overlay.setAttribute('aria-hidden', 'true');
      menuToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';

      setNavFocusable(false);

      if (restoreFocus) {
        try {
          menuToggle.focus();
        } catch {
          // ignore
        }
      }
    };

    const openMenu = () => {
      nav.classList.add('is-open');
      nav.setAttribute('aria-hidden', 'false');
      overlay.classList.add('is-visible');
      overlay.setAttribute('aria-hidden', 'false');
      menuToggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';

      setNavFocusable(true);

      const first = getFocusableLinks()[0];
      if (first && typeof first.focus === 'function') {
        first.focus();
      }
    };

    const mobileNavQuery = window.matchMedia('(max-width: 768px)');

    const syncNavForViewport = () => {
      if (mobileNavQuery.matches) {
        closeMenu(false);
        return;
      }

      nav.classList.remove('is-open');
      nav.setAttribute('aria-hidden', 'false');
      overlay.classList.remove('is-visible');
      overlay.setAttribute('aria-hidden', 'true');
      menuToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';

      setNavFocusable(true);
      try {
        nav.removeAttribute('inert');
      } catch {
        // ignore
      }
    };

    syncNavForViewport();

    try {
      mobileNavQuery.addEventListener('change', syncNavForViewport);
    } catch {
      mobileNavQuery.addListener(syncNavForViewport);
    }

    menuToggle.addEventListener('click', () => {
      if (!mobileNavQuery.matches) {
        return;
      }

      const isOpen = nav.classList.contains('is-open');
      if (isOpen) {
        closeMenu();
        return;
      }
      openMenu();
    });

    overlay.addEventListener('click', () => {
      if (!mobileNavQuery.matches) {
        return;
      }
      closeMenu();
    });

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        if (!mobileNavQuery.matches) {
          return;
        }
        closeMenu(false);
      });
    });

    // Escape closes menu.
    if (window.__LENKO_NAV_ESCAPE_BOUND__) {
      return;
    }
    window.__LENKO_NAV_ESCAPE_BOUND__ = true;

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') {
        return;
      }

      const activeNav = document.querySelector('.site-nav.is-open');
      const activeToggle = document.querySelector('.menu-toggle[aria-expanded="true"]');
      const activeOverlay = document.querySelector('.menu-overlay.is-visible');

      if (activeNav && activeToggle) {
        activeNav.classList.remove('is-open');
        activeNav.setAttribute('aria-hidden', 'true');
        if (activeOverlay) {
          activeOverlay.classList.remove('is-visible');
          activeOverlay.setAttribute('aria-hidden', 'true');
        }

        activeToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';

        activeNav.querySelectorAll('a').forEach((a) => a.setAttribute('tabindex', '-1'));

        try {
          activeToggle.focus();
        } catch {
          // ignore
        }
      }
    });
  }

  window.Nav = { init };
})();
