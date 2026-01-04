/*
 * Home Gallery
 * - Handles lightbox viewing for hardcoded multi-column image grid
 * - Opens a lightbox on click
 * - While open: click image => next image; arrows => prev/next; Esc => close
 * 
 * NOTE: Images are hardcoded in index.html for optimal LCP performance.
 * This script only handles lightbox interaction, not image loading.
 */

(function () {
  function getColumnCount() {
    return window.matchMedia('(min-width: 1024px)').matches ? 3 : 2;
  }

  const HomeGallery = {
    _bound: false,
    _rootBound: false,
    _rootEl: null,
    _rootClickHandler: null,
    _images: [],
    _activeIndex: -1,
    _lastFocusEl: null,

    init() {
      const root = document.getElementById('homeGallery');
      const lightbox = document.getElementById('homeLightbox');
      const lightboxImg = document.getElementById('homeLightboxImage');

      if (!root || !lightbox || !lightboxImg) {
        return;
      }

      this._rootEl = root;

      // WHY event delegation: Gallery may have 50-200+ images. Attaching click listeners to each
      // would create 200+ event listeners, consuming memory and slowing down DOM operations.
      // Delegating to the root element means only ONE listener for the entire gallery.
      if (!this._rootBound) {
        this._rootClickHandler = (event) => {
          const target = event.target && event.target.closest ? event.target.closest('.home-gallery__item') : null;
          if (!target) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();

          const index = Number(target.dataset.index);
          if (!Number.isFinite(index)) {
            return;
          }

          this._lastFocusEl = target;
          this._openLightbox(index);
        };

        root.addEventListener('click', this._rootClickHandler);

        // Disable right-click context menu on gallery items
        root.addEventListener('contextmenu', (event) => {
          const target = event.target && event.target.closest ? event.target.closest('.home-gallery__item, .home-gallery__img') : null;
          if (target) {
            event.preventDefault();
          }
        });

        this._rootBound = true;
      }

      if (!this._bound) {
        this._bindGlobalHandlers();
        this._bound = true;
      }

      // Read images from hardcoded HTML
      this._readImagesFromDOM(root);
    },

    // WHY destroy() exists: PJAX (single-page navigation) doesn't reload the page, so event listeners
    // and DOM references persist across navigations. Without cleanup, we'd accumulate listeners/memory.
    // destroy() prevents:
    // - Memory leaks (old galleries stay in memory)
    // - Duplicate event handlers (gallery responds to clicks on other pages)
    // - Stale DOM references (trying to update elements that no longer exist)
    destroy() {
      // Close the lightbox if we navigate away.
      this._closeLightbox({ restoreFocus: false });

      if (this._rootEl && this._rootBound && this._rootClickHandler) {
        try {
          this._rootEl.removeEventListener('click', this._rootClickHandler);
        } catch {
          // ignore
        }
      }

      const root = document.getElementById('homeGallery');
      if (root) {
        // Don't clear HTML since images are hardcoded
      }

      this._images = [];
      this._activeIndex = -1;
      this._lastFocusEl = null;
      this._rootBound = false;
      this._rootEl = null;
      this._rootClickHandler = null;
    },

    _readImagesFromDOM(root) {
      // Extract image URLs from hardcoded HTML
      const items = Array.from(root.querySelectorAll('.home-gallery__item'));
      
      // Sort items by their data-index to ensure correct order
      items.sort((a, b) => {
        const indexA = Number(a.dataset.index);
        const indexB = Number(b.dataset.index);
        return indexA - indexB;
      });
      
      this._images = items.map(item => {
        const img = item.querySelector('.home-gallery__img');
        return img ? img.src : '';
      }).filter(src => src);
    },

    _bindGlobalHandlers() {
      document.addEventListener('click', (event) => {
        // Check for navigation buttons first
        const prevBtn = event.target && event.target.closest ? event.target.closest('[data-lightbox-prev="true"]') : null;
        if (prevBtn && this._isLightboxOpen()) {
          event.stopPropagation();
          this._prev();
          return;
        }

        const nextBtn = event.target && event.target.closest ? event.target.closest('[data-lightbox-next="true"]') : null;
        if (nextBtn && this._isLightboxOpen()) {
          event.stopPropagation();
          this._next();
          return;
        }

        // Check for close actions
        const closeTarget = event.target && event.target.closest ? event.target.closest('[data-lightbox-close="true"]') : null;
        if (closeTarget && this._isLightboxOpen()) {
          // Only close if clicking stage directly (not bubbled from image)
          const isStage = event.target.hasAttribute('data-lightbox-close');
          const isBackdrop = closeTarget.classList.contains('home-lightbox__backdrop');
          const isCloseBtn = closeTarget.classList.contains('home-lightbox__close');
          
          if (isStage || isBackdrop || isCloseBtn) {
            this._closeLightbox({ restoreFocus: true });
            return;
          }
        }

        // WHY click on image advances: Provides a quick way to browse without moving cursor
        // to navigation buttons. Common pattern in photo galleries (Instagram, Google Photos).
        // Clicking the large image area is easier/faster than hitting small arrow buttons.
        const img = event.target && event.target.closest ? event.target.closest('#homeLightboxImage') : null;
        if (img && this._isLightboxOpen()) {
          this._next(); // Always advance (never close) - keeps browsing flow smooth
        }
      });

      // Disable right-click on lightbox image
      document.addEventListener('contextmenu', (event) => {
        const img = event.target && event.target.closest ? event.target.closest('#homeLightboxImage') : null;
        if (img && this._isLightboxOpen()) {
          event.preventDefault();
        }
      });

      // Keyboard navigation: Essential for accessibility and power users.
      // WHY global listener: Lightbox is a modal overlay, so keyboard events should work
      // regardless of focus. Direct binding to lightbox element would fail if user clicks
      // outside (losing focus).
      document.addEventListener('keydown', (event) => {
        if (!this._isLightboxOpen()) {
          return;
        }

        // Escape: Standard pattern for closing modals (ARIA best practices)
        if (event.key === 'Escape') {
          event.preventDefault();
          this._closeLightbox({ restoreFocus: true });
          return;
        }

        // Arrow keys: Intuitive navigation pattern (mimics left/right swipe on mobile)
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          this._next();
          return;
        }

        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          this._prev();
        }
      });
    },

    _isLightboxOpen() {
      const lightbox = document.getElementById('homeLightbox');
      return Boolean(lightbox && lightbox.classList.contains('is-open'));
    },

    _openLightbox(index) {
      const lightbox = document.getElementById('homeLightbox');
      const lightboxImg = document.getElementById('homeLightboxImage');

      if (!lightbox || !lightboxImg || !this._images.length) {
        return;
      }

      const safeIndex = ((index % this._images.length) + this._images.length) % this._images.length;
      this._activeIndex = safeIndex;

      lightboxImg.src = this._images[safeIndex];
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');

      document.body.style.overflow = 'hidden';

      // WHY Fullscreen API: Provides immersive viewing experience by removing browser chrome
      // (address bar, tabs, bookmarks) similar to pressing F11. This maximizes screen real estate
      // for viewing photos. Automatically exits on Escape key (browser built-in behavior).
      // requestFullscreen() is async and may fail (user denied, browser policy), so we handle errors silently.
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {
          // Fullscreen may be denied by browser policy or user preference - continue without it
        });
      } else if (document.documentElement.webkitRequestFullscreen) {
        // Safari/older WebKit browsers
        document.documentElement.webkitRequestFullscreen();
      } else if (document.documentElement.mozRequestFullScreen) {
        // Older Firefox
        document.documentElement.mozRequestFullScreen();
      } else if (document.documentElement.msRequestFullscreen) {
        // IE11/Edge Legacy
        document.documentElement.msRequestFullscreen();
      }

      // Ensure the image is focusable for keyboard users.
      try {
        lightboxImg.setAttribute('tabindex', '0');
        lightboxImg.focus({ preventScroll: true });
      } catch {
        // ignore
      }
    },

    _closeLightbox({ restoreFocus }) {
      const lightbox = document.getElementById('homeLightbox');
      const lightboxImg = document.getElementById('homeLightboxImage');

      if (!lightbox || !lightboxImg) {
        return;
      }

      if (!lightbox.classList.contains('is-open')) {
        return;
      }

      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      lightboxImg.removeAttribute('tabindex');
      lightboxImg.src = '';

      document.body.style.overflow = '';

      // WHY Exit fullscreen: When closing lightbox, we should return to normal browsing mode.
      // exitFullscreen() is safe to call even if not in fullscreen (it's a no-op).
      // This ensures the browser UI (address bar, tabs) returns when user closes the lightbox.
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {
          // Already exited or not in fullscreen - ignore
        });
      } else if (document.webkitExitFullscreen) {
        // Safari/older WebKit browsers
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        // Older Firefox
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        // IE11/Edge Legacy
        document.msExitFullscreen();
      }

      if (restoreFocus && this._lastFocusEl) {
        try {
          this._lastFocusEl.focus();
        } catch {
          // ignore
        }
      }
    },

    _next() {
      if (!this._images.length) {
        return;
      }
      this._openLightbox(this._activeIndex + 1);
    },

    _prev() {
      if (!this._images.length) {
        return;
      }
      this._openLightbox(this._activeIndex - 1);
    }
  };

  window.HomeGallery = HomeGallery;
})();
