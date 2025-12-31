/**
 * Portfolio Page - Parallax Scroll Effect
 *
 * Notes:
 * - This site uses PJAX navigation. That means the page can swap `#main`
 *   without a full reload.
 * - Therefore, this module must be idempotent and refreshable.
 */

// ============================================
// MODULE: Parallax Controller
// ============================================
window.PortfolioParallax = (() => {
    let portfolioItems = [];
    let ticking = false;
    let isBound = false;
    let prefersReducedMotion = false;

  /**
   * Calculate and apply parallax effect for visible items
   * @private
   */
    function updateParallax() {
        if (prefersReducedMotion) {
            return;
        }

        const windowHeight = window.innerHeight;

        portfolioItems.forEach((item) => {
            const rect = item.getBoundingClientRect();
            const image = item.querySelector('.portfolio-item__image');

            if (!image) {
                return;
            }

            if (rect.top >= windowHeight) {
                image.style.transform = 'translateY(0%)';
                return;
            }

            if (rect.bottom <= 0) {
                image.style.transform = 'translateY(-30%)';
                return;
            }

            const progress = (windowHeight - rect.top) / (windowHeight + rect.height);
            const translateY = progress * -10;

            image.style.transform = `translateY(${translateY}%)`;
        });
    }

  /**
   * Handle scroll events with requestAnimationFrame throttling
   * @private
   */
    function handleScroll() {
        if (ticking) {
            return;
        }

        window.requestAnimationFrame(() => {
            updateParallax();
            ticking = false;
        });

        ticking = true;
    }

  /**
   * Initialize parallax effect
   * @public
   */
    function refresh() {
      prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      portfolioItems = Array.from(document.querySelectorAll('[data-parallax]'));

      // If the page has no parallax items, clean up and exit.
      if (portfolioItems.length === 0) {
        destroy();
        return;
      }

      if (!isBound) {
        window.addEventListener('scroll', handleScroll, { passive: true });
        isBound = true;
      }

      // Initial state.
      updateParallax();

      // Auto-detect orientation to select portrait/landscape sizing.
      portfolioItems.forEach((item) => {
        const img = item.querySelector('.portfolio-item__image');
        if (!img) {
          return;
        }

        if (img.complete) {
          checkOrientation(img, item);
          return;
        }

        img.onload = () => checkOrientation(img, item);
      });
    }

    function init() {
      refresh();
    }

    function checkOrientation(img, itemContainer) {
      if (img.naturalWidth > img.naturalHeight) {
        itemContainer.classList.add('portfolio-item--landscape');
        itemContainer.classList.remove('portfolio-item--portrait');
        return;
      }

      itemContainer.classList.add('portfolio-item--portrait');
      itemContainer.classList.remove('portfolio-item--landscape');
    }

  /**
   * Cleanup parallax effect (useful for SPA navigation)
   * @public
   */
    function destroy() {
        if (isBound) {
            window.removeEventListener('scroll', handleScroll);
        }

        isBound = false;
        portfolioItems = [];
        ticking = false;
    }

    return {
        init,
        refresh,
        destroy
    };
})();

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    if (window.PortfolioParallax && typeof window.PortfolioParallax.init === 'function') {
        window.PortfolioParallax.init();
    }
});
