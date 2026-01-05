// ============================================================================
// GLOBAL NAVIGATION: Dynamic Injection and Mobile Menu Control
// ============================================================================
//
// PURPOSE:
//     This script provides a consistent navigation experience across all pages
//     by dynamically injecting the global navigation HTML and managing mobile
//     menu behavior. It eliminates the need to duplicate navigation markup on
//     every page and centralizes navigation logic.
//
// KEY FEATURES:
//     - Dynamic HTML injection (single source of truth)
//     - Responsive mobile menu (bottom bar with upward panel)
//     - Auto-hide on scroll down (mobile only)
//     - Active page highlighting
//     - Accessibility support (ARIA attributes)
//     - Body scroll lock when menu is open
//
// DEPENDENCIES:
//     - css/global-nav.css (styling)
//     - HTML pages must include: <div id="global-nav-container"></div>
//
// MOBILE BEHAVIOR:
//     - Navigation bar fixed to bottom of screen
//     - Menu panel slides up from bottom when opened
//     - Body scroll locked to prevent background scrolling
//     - Auto-hides on scroll down, shows on scroll up
//
// DESKTOP BEHAVIOR:
//     - Navigation bar at top of screen
//     - Menu items displayed inline (no hamburger menu)
//     - Always visible, no scroll behavior
//
// ============================================================================

(function() {
    'use strict';

    // ------------------------------------------------------------------------
    // NAVIGATION HTML TEMPLATE
    // ------------------------------------------------------------------------
    // This is the single source of truth for navigation markup.
    // Any changes to navigation structure should be made here.
    
    const navHTML = `
    <header class="site-header global-nav" role="banner">
      <div class="nav-inner">
                <a class="global-nav-brand" href="index.html">ADAM</a>
                <a href="/" class="back-to-lenko-btn">← Back to Lenko Studio</a>
                <button class="global-nav-toggle" aria-label="Toggle navigation" aria-expanded="false">
          <span></span>
          <span></span>
          <span></span>
        </button>
                <nav class="global-nav-panel" aria-label="Primary">
                        <ul class="global-nav-list">
              <li><a href="adam-features.html">Features</a></li>
              <li><a href="index.html#how-it-works">How it Works</a></li>
              <li><a href="adam-pricing.html">Pricing</a></li>
              <li><a href="adam-about.html">About</a></li>
              <li><a href="adam-simulator.html">Simulator</a></li>
              <li><a class="adam-nav-link" href="index.html#waitlist">Get Started</a></li>
            </ul>
        </nav>
      </div>
    </header>
        <div class="global-nav-overlay" aria-hidden="true"></div>
    `;


    // ========================================================================
    // INITIALIZATION FUNCTION
    // ========================================================================
    
    function initNav() {
        
        // --------------------------------------------------------------------
        // STEP 1: Inject Navigation HTML
        // --------------------------------------------------------------------
        // Inject the navigation template into the page. Prefers the dedicated
        // container but has fallback logic for edge cases.
        
        const container = document.getElementById('global-nav-container');
        
        if (container) {
            // Standard case: inject into the designated container
            container.innerHTML = navHTML;
        } else {
            // Fallback: No container found, create one and inject navigation
            // This handles pages that may have forgotten the container div
            
            const existingHeader = document.querySelector('header.site-header');
            
            if (existingHeader) {
                // Replace existing header with our navigation
                const div = document.createElement('div');
                div.id = 'global-nav-container';
                div.innerHTML = navHTML;
                existingHeader.replaceWith(div);
            } else {
                // No existing header, prepend to body
                const div = document.createElement('div');
                div.id = 'global-nav-container';
                div.innerHTML = navHTML;
                document.body.prepend(div);
            }
        }


        // --------------------------------------------------------------------
        // STEP 2: Highlight Current Page
        // --------------------------------------------------------------------
        // Adds aria-current="page" to the navigation link that matches the
        // current page URL. This provides accessibility and visual feedback.
        
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        const links = document.querySelectorAll('.global-nav-list a');
        
        links.forEach(link => {
            const href = link.getAttribute('href');
            
            // Check if link href matches current page
            if (href === currentPath || (currentPath === 'index.html' && href === 'index.html')) {
                link.setAttribute('aria-current', 'page');
            }
            
            // Special case for simulator page
            if (currentPath === 'adam-simulator.html' && href === 'adam-simulator.html') {
                link.setAttribute('aria-current', 'page');
            }
        });


        // --------------------------------------------------------------------
        // STEP 3: Cache DOM References
        // --------------------------------------------------------------------
        // Store references to key elements for mobile menu functionality
        
        const menuToggle = document.querySelector('.global-nav-toggle');
        const nav = document.querySelector('.global-nav-panel');
        const overlay = document.querySelector('.global-nav-overlay');
        const navLinks = document.querySelectorAll('.global-nav-list a');
        const header = document.querySelector('.site-header.global-nav');
        const navInner = header ? header.querySelector('.nav-inner') : null;
        const globalNavContainer = document.getElementById('global-nav-container');


        // --------------------------------------------------------------------
        // STEP 4: Dynamic Layout Helpers
        // --------------------------------------------------------------------
        
        /**
         * Update CSS Custom Property for Header Height
         * 
         * Sets --global-nav-bar-height CSS variable so other elements can
         * reference the exact header height (useful for viewport calculations).
         */
        const updateBarHeightVar = () => {
            if (!header) return;
            document.documentElement.style.setProperty(
                '--global-nav-bar-height', 
                `${header.offsetHeight}px`
            );
        };

        /**
         * Detect Mobile Layout
         * 
         * Returns true if we're in mobile layout mode (viewport <= 768px).
         * Uses media query if available, falls back to checking hamburger visibility.
         * 
         * @returns {boolean} True if mobile layout is active
         */
        const isMobileLayout = () => {
            try {
                if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) {
                    return true;
                }
            } catch (e) {
                // Ignore matchMedia errors in older browsers
            }
            
            // Fallback: check if hamburger toggle is visible
            return !!(menuToggle && window.getComputedStyle(menuToggle).display !== 'none');
        };

        /**
         * Place Navigation Elements
         * 
         * Repositions navigation elements based on viewport size to avoid
         * CSS containment issues with fixed positioning.
         * 
         * MOBILE: Header and nav panel attached directly to body (avoids clipping)
         * DESKTOP: Header stays in container, nav panel nested in header
         */
        const placeNav = () => {
            if (!nav || !overlay) return;

            // Overlay always stays as direct child of body (for full-screen coverage)
            if (overlay.parentElement !== document.body) {
                document.body.appendChild(overlay);
            }

            if (isMobileLayout()) {
                // MOBILE: Attach header and panel directly to body
                // This prevents fixed elements from being clipped by page containers
                
                if (header && header.parentElement !== document.body) {
                    document.body.insertBefore(header, document.body.firstChild);
                }
                
                if (nav.parentElement !== document.body) {
                    document.body.appendChild(nav);
                }
            } else {
                // DESKTOP: Keep header in container, nest panel in header
                
                if (header && globalNavContainer && header.parentElement !== globalNavContainer) {
                    globalNavContainer.prepend(header);
                }
                
                if (navInner && nav.parentElement !== navInner) {
                    navInner.appendChild(nav);
                }
            }
        };


        // --------------------------------------------------------------------
        // STEP 5: Initialize Layout
        // --------------------------------------------------------------------
        // Set initial header height and element positions
        
        updateBarHeightVar();
        
        // Use requestAnimationFrame to ensure layout is complete before measuring
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(updateBarHeightVar);
        }
        
        placeNav();
        
        // Re-measure and re-position on window resize
        window.addEventListener('resize', () => {
            updateBarHeightVar();
            placeNav();
        }, { passive: true });


        // --------------------------------------------------------------------
        // STEP 6: Mobile Menu Toggle Logic
        // --------------------------------------------------------------------
        
        if (menuToggle && nav && overlay) {
            
            /**
             * Close Mobile Menu
             * 
             * Hides the menu panel, removes overlay, unlocks body scroll,
             * and restores previous scroll position.
             */
            const closeMenu = () => {
                // Remove open state classes
                nav.classList.remove('is-open');
                nav.setAttribute('aria-hidden', 'true');
                overlay.classList.remove('is-visible');
                overlay.setAttribute('aria-hidden', 'true');
                menuToggle.setAttribute('aria-expanded', 'false');
                
                // Unlock body scroll
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.width = '';
                document.body.style.top = '';
                
                // Restore previous scroll position
                window.scrollTo(0, parseInt(document.body.dataset.scrollY || '0'));
                delete document.body.dataset.scrollY;
            };

            /**
             * Open Mobile Menu
             * 
             * Shows the menu panel, displays overlay, and locks body scroll
             * to prevent background scrolling while menu is open.
             */
            const openMenu = () => {
                // Ensure proper element placement before opening
                placeNav();
                
                // Store current scroll position
                document.body.dataset.scrollY = window.scrollY.toString();
                
                // Lock body scroll (prevents background scrolling)
                document.body.style.top = `-${window.scrollY}px`;
                document.body.style.position = 'fixed';
                document.body.style.width = '100%';
                document.body.style.overflow = 'hidden';
                
                // Show menu and overlay
                nav.classList.add('is-open');
                nav.setAttribute('aria-hidden', 'false');
                overlay.classList.add('is-visible');
                overlay.setAttribute('aria-hidden', 'false');
                menuToggle.setAttribute('aria-expanded', 'true');
            };

            // Toggle menu on hamburger click
            menuToggle.addEventListener('click', () => {
                const isOpen = nav.classList.contains('is-open');
                if (isOpen) {
                    closeMenu();
                } else {
                    openMenu();
                }
            });

            // Close menu when overlay is clicked
            overlay.addEventListener('click', closeMenu);
            
            // Close menu when any navigation link is clicked
            navLinks.forEach(link => link.addEventListener('click', closeMenu));
        }


        // --------------------------------------------------------------------
        // STEP 7: Auto-Hide on Scroll (Mobile Only)
        // --------------------------------------------------------------------
        // Hides the bottom navigation bar when scrolling down, shows it when
        // scrolling up. This maximizes screen space on mobile devices.
        
        let lastScrollTop = 0;
        let ticking = false;  // Throttle scroll events using requestAnimationFrame
        const headerForScroll = document.querySelector('.site-header.global-nav');
        
        if (headerForScroll) {
            
            /**
             * Handle Scroll Event
             * 
             * Determines scroll direction and shows/hides the navigation bar.
             * Only active on mobile viewport (width <= 768px).
             */
            const handleScroll = () => {
                // Only apply on mobile
                if (window.innerWidth > 768) return;

                // Don't hide nav when menu is open
                if (nav && nav.classList.contains('is-open')) return;

                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                
                // Ignore negative scroll (iOS rubber banding effect)
                if (scrollTop < 0) return;

                // Minimal threshold to avoid micro-jitter from tiny scroll changes
                if (Math.abs(scrollTop - lastScrollTop) < 2) return;

                if (scrollTop > lastScrollTop) {
                    // Scrolling DOWN -> Hide navigation bar
                    headerForScroll.classList.add('nav-hidden');
                } else {
                    // Scrolling UP -> Show navigation bar
                    headerForScroll.classList.remove('nav-hidden');
                }
                
                lastScrollTop = scrollTop;
            };

            // Throttled scroll handler using requestAnimationFrame
            // This prevents excessive reflows and improves scroll performance
            const throttledScrollHandler = () => {
                if (!ticking) {
                    requestAnimationFrame(() => {
                        handleScroll();
                        ticking = false;
                    });
                    ticking = true;
                }
            };

            // Listen to scroll events
            window.addEventListener('scroll', throttledScrollHandler, { passive: true });

            // Also listen to touchmove for immediate response on touch devices
            // touchmove fires continuously during finger movement
            window.addEventListener('touchmove', throttledScrollHandler, { passive: true });
        }
    }


    // ========================================================================
    // AUTO-INITIALIZE
    // ========================================================================
    // Run initialization when DOM is ready
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNav);
    } else {
        // DOM already loaded, initialize immediately
        initNav();
    }
    
})();
