/*
 * Home Gallery
 * - Renders a multi-column image grid
 * - Opens a lightbox on click
 * - While open: click image => next image; arrows => prev/next; Esc => close
 */

(function () {
  const MANIFEST_URL = 'media/home/manifest.json';

  // Sequential loading strategy: Probe for images using a naming pattern (e.g., "i (1).jpg", "i (2).jpg").
  // WHY: This eliminates the need to maintain manifest.json for small galleries.
  // Users can simply drop files with sequential names into media/home/ and the gallery auto-discovers them.
  // This is especially useful for quick prototypes or when working with non-technical users.
  const SEQUENTIAL = {
    enabled: true,
    dir: 'media/home/',
    prefix: 'i (',
    suffix: ').jpg',
    start: 1,
    max: 200,
    // WHY maxConsecutiveMissingAfterFound: Stops probing after 15 consecutive missing images.
    // This prevents scanning all 200 slots if the user only has, say, 10 images.
    // Without this, we'd waste time probing 190 non-existent images.
    maxConsecutiveMissingAfterFound: 15,
    // WHY timeout: Static hosts (e.g., GitHub Pages, Netlify) may be slow to respond.
    // 8 seconds ensures images aren't skipped due to network latency.
    probeTimeoutMs: 8000
  };

  function buildSequentialUrl(index) {
    return `${SEQUENTIAL.dir}${SEQUENTIAL.prefix}${index}${SEQUENTIAL.suffix}`;
  }

  // Probe if an image exists at the given URL.
  // WHY: We can't use HEAD requests because many static hosts (GitHub Pages, S3) don't support CORS for HEAD.
  // WHY timeout: On slow networks or static hosts, images may take several seconds to load.
  // Without timeout, the entire gallery loading would hang on a single missing/slow image.
  function probeImage(url, timeoutMs) {
    return new Promise((resolve) => {
      const img = new Image();
      let done = false; // Ensures we only resolve once (timeout OR load/error)
      const timeout = window.setTimeout(() => {
        if (done) {
          return;
        }
        done = true;
        img.onload = null;
        img.onerror = null;
        resolve(false);
      }, timeoutMs);

      img.onload = () => {
        if (done) {
          return;
        }
        done = true;
        window.clearTimeout(timeout);
        img.onload = null;
        img.onerror = null;
        resolve(true);
      };

      img.onerror = () => {
        if (done) {
          return;
        }
        done = true;
        window.clearTimeout(timeout);
        img.onload = null;
        img.onerror = null;
        resolve(false);
      };

      // WHY regular GET instead of HEAD: Static hosts (GitHub Pages, S3, Netlify) often don't support
      // HEAD requests with proper CORS headers. Using img.src triggers a GET that's universally supported.
      // The browser caches the image, so when we render it later, it's already loaded (performance win).
      img.src = url;
    });
  }

  async function loadHomeImagesSequential() {
    if (!SEQUENTIAL.enabled) {
      return [];
    }

    const images = [];
    let foundAny = false;
    let missingStreak = 0;

    for (let i = SEQUENTIAL.start; i <= SEQUENTIAL.max; i += 1) {
      const url = buildSequentialUrl(i);
      // WHY await in loop: We probe images sequentially (not in parallel) to avoid overwhelming
      // the server with 200 simultaneous requests. This is especially important for static hosts
      // that may rate-limit or throttle. Sequential probing is slow but reliable.
      // eslint-disable-next-line no-await-in-loop
      const ok = await probeImage(url, SEQUENTIAL.probeTimeoutMs);
      if (ok) {
        images.push(url);
        foundAny = true;
        missingStreak = 0; // Reset the missing streak when we find an image
      } else {
        missingStreak += 1;
        // WHY check foundAny: Before we find the first image, gaps are expected (e.g., start at 5).
        // After finding images, a long gap (15+) likely means we've reached the end.
        if (foundAny && missingStreak >= SEQUENTIAL.maxConsecutiveMissingAfterFound) {
          break;
        }
      }
    }

    return images;
  }

  // WHY manifest.json exists: For large galleries (100+ images), sequential probing is too slow.
  // The manifest provides instant loading since all filenames are known upfront.
  // It's also useful when filenames don't follow a pattern (mixed naming conventions).
  async function loadHomeImagesFromManifest() {
    const res = await fetch(MANIFEST_URL, { credentials: 'same-origin' });
    if (!res.ok) {
      throw new Error(`Failed to load ${MANIFEST_URL} (HTTP ${res.status})`);
    }

    const data = await res.json();
    const basePath = typeof data?.basePath === 'string' ? data.basePath : 'media/home/';
    const names = Array.isArray(data?.images) ? data.images : [];

    const images = names
      .filter((name) => typeof name === 'string' && name.trim())
      .map((name) => {
        // Allow either filenames or paths in the manifest.
        if (name.includes('/') || name.includes('\\')) {
          return name;
        }
        return `${basePath}${name}`;
      });

    return images;
  }

  function shuffle(items) {
    const arr = items.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function getSessionStorage(key) {
    try {
      return window.sessionStorage ? window.sessionStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }

  function setSessionStorage(key, value) {
    try {
      if (window.sessionStorage) {
        window.sessionStorage.setItem(key, value);
      }
    } catch {
      // ignore
    }
  }

  function shuffleGuaranteedDifferent(items, storageKey) {
    const previous = getSessionStorage(storageKey);

    let next = shuffle(items);
    if (!previous) {
      setSessionStorage(storageKey, next.join('|'));
      return next;
    }

    // Try a few times to avoid repeating the exact same order.
    // (Important when the list is short and users refresh quickly.)
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const serialized = next.join('|');
      if (serialized !== previous) {
        setSessionStorage(storageKey, serialized);
        return next;
      }
      next = shuffle(items);
    }

    // Fall back: even if it repeats, we still return a valid order.
    setSessionStorage(storageKey, next.join('|'));
    return next;
  }

  function getColumnCount() {
    return window.matchMedia('(min-width: 1024px)').matches ? 3 : 2;
  }

  const HomeGallery = {
    _bound: false,
    _rootBound: false,
    _rootEl: null,
    _rootClickHandler: null,
    _manifestPromise: null,
    _baseImages: [],
    _initToken: 0,
    _images: [],
    _activeIndex: -1,
    _lastFocusEl: null,

    init() {
      const token = (this._initToken += 1);
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

      // Load images dynamically from the folder manifest.
      this._ensureBaseImages()
        .then((baseImages) => {
          // If PJAX navigated away while we were loading, abort.
          if (token !== this._initToken) {
            return;
          }

          this._images = shuffleGuaranteedDifferent(baseImages, 'homeGalleryOrder');
          this._activeIndex = -1;
          this._renderColumns(root);
        })
        .catch(() => {
          // If manifest fails to load, render nothing (fail-safe).
          if (token !== this._initToken) {
            return;
          }
          this._images = [];
          this._activeIndex = -1;
          root.innerHTML = '';
        });
    },

    // WHY destroy() exists: PJAX (single-page navigation) doesn't reload the page, so event listeners
    // and DOM references persist across navigations. Without cleanup, we'd accumulate listeners/memory.
    // destroy() prevents:
    // - Memory leaks (old galleries stay in memory)
    // - Duplicate event handlers (gallery responds to clicks on other pages)
    // - Stale DOM references (trying to update elements that no longer exist)
    destroy() {
      this._initToken += 1; // Invalidate any pending async operations (image loading)
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
        root.innerHTML = '';
      }

      this._images = [];
      this._baseImages = [];
      this._manifestPromise = null;
      this._activeIndex = -1;
      this._lastFocusEl = null;
      this._rootBound = false;
      this._rootEl = null;
      this._rootClickHandler = null;
    },

    async _ensureBaseImages() {
      // Cache images so we don't re-probe on every render (e.g., window resize)
      if (Array.isArray(this._baseImages) && this._baseImages.length) {
        return this._baseImages;
      }

      // WHY single promise: Prevents duplicate loading if init() is called multiple times rapidly.
      // Without this, each init() would trigger a new probe/fetch, wasting bandwidth.
      if (!this._manifestPromise) {
        this._manifestPromise = (async () => {
          // WHY sequential first: Zero-maintenance workflow preferred for small galleries.
          // Users can add images without touching code or running build scripts.
          try {
            const sequential = await loadHomeImagesSequential();
            if (Array.isArray(sequential) && sequential.length) {
              return sequential;
            }
          } catch {
            // ignore
          }

          // WHY manifest fallback: If sequential fails (disabled or no images found),
          // fall back to manifest.json. This provides flexibility: small galleries use sequential,
          // large galleries (100+ images) use manifest for instant loading.
          return loadHomeImagesFromManifest();
        })();
      }

      const images = await this._manifestPromise;
      this._baseImages = Array.isArray(images) ? images : [];
      return this._baseImages;
    },

    _renderColumns(root) {
      const columns = getColumnCount();
      root.innerHTML = '';

      if (!this._images.length) {
        return;
      }

      // Create column containers for masonry layout
      const columnEls = [];
      for (let i = 0; i < columns; i += 1) {
        const col = document.createElement('div');
        col.className = 'home-gallery__column';
        root.appendChild(col);
        columnEls.push(col);
      }

      // WHY simple modulo distribution (idx % columns): This round-robin approach ensures
      // equal image counts per column. While it doesn't guarantee equal heights (that would
      // require measuring image dimensions), it's fast and produces acceptable visual balance.
      // A true height-balanced masonry would require:
      // 1) Loading all images first (slow)
      // 2) Tracking cumulative column heights (complex)
      // 3) Re-sorting on window resize (expensive)
      // Simple modulo is "good enough" and blazingly fast.
      this._images.forEach((src, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'home-gallery__item';
        btn.setAttribute('aria-label', 'Open image');
        btn.dataset.index = String(idx);

        const img = document.createElement('img');
        img.className = 'home-gallery__img';
        // WHY lazy loading: Galleries can have 100+ images (10+ MB total).
        // loading="lazy" uses Intersection Observer API to load images only when they're
        // near the viewport. This drastically improves initial page load (only 5-10 images
        // load initially instead of 100+), reduces bandwidth for users who don't scroll,
        // and improves perceived performance.
        img.loading = 'lazy';
        img.alt = ''; // Decorative images don't need alt text (WCAG allows this)
        img.src = src;

        btn.appendChild(img);

        const col = columnEls[idx % columns];
        col.appendChild(btn);
      });

      // Re-render on breakpoint changes
      const mq = window.matchMedia('(min-width: 1024px)');
      const handleMq = () => {
        const stillOnHome = Boolean(document.getElementById('homeGallery'));
        if (!stillOnHome) {
          return;
        }
        this._renderColumns(document.getElementById('homeGallery'));
      };

      // Avoid stacking listeners by removing the old one first.
      try {
        if (this._mq && this._mqListener) {
          this._mq.removeEventListener('change', this._mqListener);
        }
      } catch {
        // ignore
      }

      this._mq = mq;
      this._mqListener = handleMq;
      try {
        mq.addEventListener('change', handleMq);
      } catch {
        // Safari < 14
        mq.addListener(handleMq);
      }
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
