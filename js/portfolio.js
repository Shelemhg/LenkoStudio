/**
 * Portfolio Page - Parallax Scroll Effect
 * Implements performant scroll-based parallax on portfolio images
 */

// ============================================
// MODULE: Parallax Controller
// ============================================
window.PortfolioParallax = (() => {
  // Private variables
  let portfolioItems = [];
  let ticking = false;

  /**
   * Calculate and apply parallax effect for visible items
   * @private
   */
  function updateParallax() {
    const windowHeight = window.innerHeight;

    portfolioItems.forEach(item => {
      const rect = item.getBoundingClientRect();
      const image = item.querySelector('.portfolio-item__image');
      
      if (!image) return;

      // If item hasn't entered viewport yet (below screen), keep at top
      if (rect.top >= windowHeight) {
        image.style.transform = 'translateY(0%)';
        return;
      }
      
      // If item has completely left viewport (above screen), keep at final position
      if (rect.bottom <= 0) {
        image.style.transform = 'translateY(-30%)';
        return;
      }

      // Item is in viewport - calculate parallax
      // progress = 0 when item enters from bottom
      // progress = 1 when item exits from top
      const progress = (windowHeight - rect.top) / (windowHeight + rect.height);

      // Calculate parallax translation
      // Range: 0% to -10% (matches the 110% height in CSS)
      const translateY = progress * -10;

      image.style.transform = `translateY(${translateY}%)`;
    });
  }

  /**
   * Handle scroll events with requestAnimationFrame throttling
   * @private
   */
  function handleScroll() {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateParallax();
        ticking = false;
      });
      ticking = true;
    }
  }

  /**
   * Initialize parallax effect
   * @public
   */
  function init() {
    // Cache portfolio items
    portfolioItems = Array.from(document.querySelectorAll('[data-parallax]'));

    if (portfolioItems.length === 0) {
      console.warn('No portfolio items found for parallax effect');
      return;
    }

    // Attach scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Calculate initial state
    updateParallax();
    
    // Auto-detect orientation for all portfolio images
    portfolioItems.forEach(item => {
        const img = item.querySelector('.portfolio-item__image');
        if (img) {
            if (img.complete) {
                checkOrientation(img, item);
            } else {
                img.onload = () => checkOrientation(img, item);
            }
        }
    });

    console.log(`Portfolio parallax initialized for ${portfolioItems.length} items`);
  }

  function checkOrientation(img, itemContainer) {
      if (img.naturalWidth > img.naturalHeight) {
          itemContainer.classList.add('portfolio-item--landscape');
          itemContainer.classList.remove('portfolio-item--portrait');
      } else {
          itemContainer.classList.add('portfolio-item--portrait');
          itemContainer.classList.remove('portfolio-item--landscape');
      }
  }

  /**
   * Cleanup parallax effect (useful for SPA navigation)
   * @public
   */
  function destroy() {
    window.removeEventListener('scroll', handleScroll);
    portfolioItems = [];
    ticking = false;
  }

  // Public API
  return {
    init,
    destroy
  };
})();

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  PortfolioParallax.init();
});

// ============================================
// UTILITY: Update Year in Footer
// ============================================
const yearElement = document.getElementById('year');
if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}
