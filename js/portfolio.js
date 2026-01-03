/**
 * Portfolio Page - Parallax Scroll Effect
 *
 * ARCHITECTURE NOTES:
 * 
 * PJAX Re-initialization (Idempotency):
 * - This site uses PJAX navigation which swaps `#main` without full page reload.
 * - When navigating back to portfolio page, this module will be called again
 *   on the SAME JavaScript runtime (no page refresh to reset state).
 * - Therefore, this module MUST be idempotent: calling refresh() multiple times
 *   should not create duplicate event listeners or memory leaks.
 * - The isBound flag prevents duplicate scroll listeners.
 * - The destroy() method ensures clean teardown when leaving the page.
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
   * 
   * ACCESSIBILITY (Motion Preferences):
   * - Respects user's 'prefers-reduced-motion' OS/browser setting.
   * - Some users experience vestibular disorders or motion sickness from parallax.
   * - When detected, we skip ALL parallax calculations (no-op).
   * - This is a WCAG 2.1 Level AAA accessibility requirement.
   * 
   * @private
   */
    function updateParallax() {
        // Respect accessibility: skip animations if user prefers reduced motion
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

            // PARALLAX MATH (Progress Calculation):
            // - progress = 0 when item just enters viewport bottom (rect.top = windowHeight)
            // - progress = 1 when item exits viewport top (rect.top = -rect.height)
            // - Formula: (windowHeight - rect.top) / (windowHeight + rect.height)
            //   * Numerator: distance item has traveled through viewport
            //   * Denominator: total possible travel distance
            // - Result: smooth 0→1 value representing scroll progress through viewport
            const progress = (windowHeight - rect.top) / (windowHeight + rect.height);
            
            // Apply parallax translation:
            // - Multiply progress by -10 to get -10% max movement
            // - Negative value moves image UP as you scroll DOWN (parallax effect)
            // - -10% chosen to be subtle but noticeable
            const translateY = progress * -10;

            image.style.transform = `translateY(${translateY}%)`;
        });
    }

  /**
   * Handle scroll events with requestAnimationFrame throttling
   * 
   * PERFORMANCE OPTIMIZATION (RAF Throttling):
   * - Scroll events fire VERY frequently (100+ times per second on smooth scrolling).
   * - Directly updating parallax on every event would cause excessive layout recalculation.
   * - Instead, we use requestAnimationFrame to batch updates to the browser's paint cycle.
   * - The 'ticking' flag ensures only ONE animation frame is queued at a time.
   * - This throttles updates to ~60fps max, preventing redundant calculations.
   * - Result: Smooth performance even on lower-end devices.
   * 
   * @private
   */
    function handleScroll() {
        // If update is already queued, skip this scroll event
        if (ticking) {
            return;
        }

        // Queue update for next animation frame (browser's paint cycle)
        window.requestAnimationFrame(() => {
            updateParallax();
            ticking = false;  // Allow next frame to be queued
        });

        ticking = true;  // Mark frame as queued
    }

  /**
   * Initialize parallax effect
   * @public
   */
    function refresh() {
      // Check user's motion preference (accessibility)
      // This media query detects OS-level "reduce motion" setting
      prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Find all elements with parallax enabled
      portfolioItems = Array.from(document.querySelectorAll('[data-parallax]'));

      // If the page has no parallax items, clean up and exit.
      if (portfolioItems.length === 0) {
        destroy();
        return;
      }

      // PERFORMANCE (Passive Event Listener):
      // - passive: true tells browser we will NOT call event.preventDefault()
      // - This allows browser to optimize scrolling performance:
      //   * Browser can scroll immediately without waiting for JS
      //   * Prevents "jank" from JS blocking the main thread
      //   * Critical for smooth 60fps scrolling on mobile devices
      // - passive: true is best practice for scroll/touch listeners
      if (!isBound) {
        window.addEventListener('scroll', handleScroll, { passive: true });
        isBound = true;
      }

      // Initial state.
      updateParallax();

      // IMAGE ORIENTATION DETECTION:
      // - Portfolio images can be portrait or landscape aspect ratios.
      // - CSS needs to know orientation to apply correct sizing/cropping.
      // - We detect orientation in JS because:
      //   1. CSS can't read image dimensions until loaded
      //   2. Different images need different layout treatment
      // - Adds 'portfolio-item--portrait' or 'portfolio-item--landscape' class
      // - Must handle both already-loaded images (cached) and loading images
      portfolioItems.forEach((item) => {
        const img = item.querySelector('.portfolio-item__image');
        if (!img) {
          return;
        }

        // Image already loaded (from cache)? Check orientation immediately
        if (img.complete) {
          checkOrientation(img, item);
          return;
        }

        // Image still loading? Wait for load event
        img.onload = () => checkOrientation(img, item);
      });
    }

    function init() {
      refresh();
    }

    /**
     * Detect if image is portrait or landscape based on natural dimensions
     * 
     * ORIENTATION LOGIC:
     * - naturalWidth/naturalHeight = actual image dimensions (not display size)
     * - If width > height → landscape (e.g., 1920x1080)
     * - If height >= width → portrait (e.g., 1080x1920)
     * - CSS uses these classes to apply appropriate object-fit and sizing
     * - Removes opposite class to prevent conflicts on re-initialization
     */
    function checkOrientation(img, itemContainer) {
      if (img.naturalWidth > img.naturalHeight) {
        // Landscape image: wider than tall
        itemContainer.classList.add('portfolio-item--landscape');
        itemContainer.classList.remove('portfolio-item--portrait');
        return;
      }

      // Portrait image: taller than wide (or square)
      itemContainer.classList.add('portfolio-item--portrait');
      itemContainer.classList.remove('portfolio-item--landscape');
    }

  /**
   * Cleanup parallax effect (useful for SPA navigation)
   * 
   * PJAX CLEANUP (Memory Management):
   * - CRITICAL for PJAX: When user navigates away from portfolio page,
   *   the scroll listener would continue firing even though DOM nodes are gone.
   * - This would cause:
   *   1. Memory leaks (portfolioItems array holding dead references)
   *   2. Wasted CPU (scroll handler running when not needed)
   *   3. Potential errors (querySelectorAll on detached nodes)
   * - destroy() is called by PJAX before swapping content.
   * - Removes event listener and clears all references to DOM nodes.
   * - Allows garbage collection of old page content.
   * 
   * @public
   */
    function destroy() {
        // Remove scroll listener to prevent wasted CPU and memory leaks
        if (isBound) {
            window.removeEventListener('scroll', handleScroll);
        }

        // Reset state to allow re-initialization
        isBound = false;
        portfolioItems = [];  // Clear DOM references for garbage collection
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
