// ============================================================================
// WEB COMPONENTS: Reusable Site Header and Footer
// ============================================================================
//
// PURPOSE:
//     Defines custom HTML elements (<site-header> and <site-footer>) that
//     encapsulate navigation and footer markup/behavior. This promotes
//     consistency across pages and reduces code duplication.
//
// COMPONENTS:
//     1. <site-header> - Main navigation with mobile hamburger menu
//     2. <site-footer> - Standard footer with social links
//
// GOALS:
//     - Keep navigation consistent across all pages
//     - Keep markup small and cacheable
//     - Separation of concerns (audio handled in app.js)
//     - Accessibility-first design
//
// USAGE:
//     In HTML, simply use:
//         <site-header current="home"></site-header>
//         <site-footer></site-footer>
//
// NOTE:
//     This file is for legacy pages. New ADAM pages use the global-nav.js
//     injection system instead. Both systems are maintained for compatibility.
//
// ============================================================================


// ============================================================================
// SITE HEADER COMPONENT
// ============================================================================
//
// Custom element that provides site-wide navigation with:
//     - Responsive hamburger menu for mobile
//     - Active page highlighting
//     - Sound toggle button
//     - Accessibility features (ARIA, keyboard nav)
//     - Focus management
//
// ATTRIBUTES:
//     current - Current page identifier for highlighting (e.g., "home", "portfolio")
//
// ============================================================================

class SiteHeader extends HTMLElement {
    
    // Class-level flag to prevent duplicate event binding
    static _escapeBound = false;

    /**
     * Called when element is inserted into DOM
     * 
     * This is the Web Component lifecycle hook that runs when the element
     * is added to the page. We use it to inject our navigation HTML and
     * set up interactive behavior.
     */
    connectedCallback() {
        
        // --------------------------------------------------------------------
        // Read Attributes and State
        // --------------------------------------------------------------------
        
        const currentPage = this.getAttribute('current') || '';
        const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
        const soundLabel = soundEnabled ? 'Sound On' : 'Sound Off';

        
        // --------------------------------------------------------------------
        // Inject Navigation HTML
        // --------------------------------------------------------------------
        // Template includes header, nav, hamburger toggle, and overlay
        
        this.innerHTML = `
            <header class="site-header" role="banner">
                <button class="menu-toggle" type="button" aria-expanded="false" aria-label="Toggle menu" aria-controls="primaryNav">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>

                <nav id="primaryNav" class="site-nav" aria-label="${t.primary_nav}" aria-hidden="false">
                    <a class="brand" href="${pathPrefix}index.html"${currentPage === 'home' ? ' aria-current="page"' : ''}>${t.brand}</a>

                    <ul class="nav-list">
                        <li><a href="portfolio.html"${currentPage === 'portfolio' ? ' aria-current="page"' : ''}>Portfolio</a></li>
                        <li><a href="simulator.html"${currentPage === 'simulator' ? ' aria-current="page"' : ''}>Simulator</a></li>
                        <li><a href="about.html"${currentPage === 'about' ? ' aria-current="page"' : ''}>About</a></li>
                        <li><a href="contact.html"${currentPage === 'contact' ? ' aria-current="page"' : ''}>Contact</a></li>
                        <li><a class="adam-link" href="https://adam.lenkostudio.com" target="_blank" rel="noopener">For Creators — ADAM</a></li>
                    </ul>

                    <!-- Mobile: Actions inside nav for sliding panel -->
                    <div class="header-actions header-actions--mobile">
                        <a href="${altLangUrl}" class="lang-toggle" aria-label="${t.language}: ${altLangLabel}" title="${altLangLabel}">
                            <span class="lang-icon">🌐</span>
                            <span class="lang-code">${altLang.toUpperCase()}</span>
                        </a>
                        <button id="soundToggleMobile" class="sound-toggle" type="button" 
                                aria-pressed="${soundEnabled ? 'true' : 'false'}" 
                                aria-label="${soundLabel}"
                                data-label-on="${t.sound_on}"
                                data-label-off="${t.sound_off}">${soundLabel}</button>
                    </div>
                </nav>

                <!-- Desktop: Actions outside nav -->
                <div class="header-actions header-actions--desktop">
                    <a href="${altLangUrl}" class="lang-toggle" aria-label="${t.language}: ${altLangLabel}" title="${altLangLabel}">
                        <span class="lang-icon">🌐</span>
                        <span class="lang-code">${altLang.toUpperCase()}</span>
                    </a>
                    <button id="soundToggle" class="sound-toggle" type="button" 
                            aria-pressed="${soundEnabled ? 'true' : 'false'}" 
                            aria-label="${soundLabel}"
                            data-label-on="${t.sound_on}"
                            data-label-off="${t.sound_off}">${soundLabel}</button>
                </div>
            </header>

            <div class="menu-overlay" aria-hidden="true"></div>
        `;

        
        // --------------------------------------------------------------------
        // Initialize Mobile Menu Behavior
        // --------------------------------------------------------------------
        // Wait for next frame to ensure DOM is fully rendered
        
        requestAnimationFrame(() => {
            const menuToggle = this.querySelector('.menu-toggle');
            const nav = this.querySelector('.site-nav');
            const overlay = this.querySelector('.menu-overlay');

            // Early exit if required elements are missing
            if (!menuToggle || !nav || !overlay) {
                return;
            }

            
            // ----------------------------------------------------------------
            // Helper Functions
            // ----------------------------------------------------------------

            /**
             * Get all focusable navigation links
             * @returns {Array<HTMLElement>} Array of link elements
             */
            const getFocusableLinks = () => Array.from(nav.querySelectorAll('a'));

            /**
             * Enable or disable keyboard focus on navigation links
             * 
             * When menu is closed on mobile, we disable tab navigation through
             * the off-screen menu to improve keyboard navigation UX.
             * 
             * @param {boolean} enabled - Whether links should be focusable
             */
            function setNavFocusable(enabled) {
                const links = getFocusableLinks();

                links.forEach((a) => {
                    if (enabled) {
                        // Restore previous tabindex state
                        const prev = a.getAttribute('data-prev-tabindex');
                        if (prev !== null) {
                            a.setAttribute('tabindex', prev);
                            a.removeAttribute('data-prev-tabindex');
                        } else {
                            a.removeAttribute('tabindex');
                        }
                        return;
                    }

                    // Disable tab stops when menu is closed (mobile)
                    const current = a.getAttribute('tabindex');
                    if (current !== null) {
                        a.setAttribute('data-prev-tabindex', current);
                    }
                    a.setAttribute('tabindex', '-1');
                });

                // Use the 'inert' attribute when available (better accessibility)
                try {
                    if (!enabled) {
                        nav.setAttribute('inert', '');
                    } else {
                        nav.removeAttribute('inert');
                    }
                } catch {
                    // inert not supported in older browsers; tabindex handling above still helps
                }
            }

            /**
             * Close Mobile Menu
             * 
             * Hides menu, removes overlay, re-enables body scroll, and
             * optionally returns focus to the toggle button.
             * 
             * @param {boolean} restoreFocus - Whether to return focus to toggle
             */
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
                        // Focus may fail in some edge cases, ignore
                    }
                }
            };

            /**
             * Open Mobile Menu
             * 
             * Shows menu, displays overlay, locks body scroll, and moves
             * keyboard focus to first link for accessibility.
             */
            const openMenu = () => {
                nav.classList.add('is-open');
                nav.setAttribute('aria-hidden', 'false');
                overlay.classList.add('is-visible');
                overlay.setAttribute('aria-hidden', 'false');
                menuToggle.setAttribute('aria-expanded', 'true');
                document.body.style.overflow = 'hidden';

                setNavFocusable(true);

                // Move focus to first link for keyboard users
                const first = getFocusableLinks()[0];
                if (first && typeof first.focus === 'function') {
                    first.focus();
                }
            };

            
            // ----------------------------------------------------------------
            // Responsive Behavior
            // ----------------------------------------------------------------
            // Sync menu state with viewport size changes
            
            const mobileNavQuery = window.matchMedia('(max-width: 768px)');

            /**
             * Synchronize navigation state with viewport size
             * 
             * MOBILE: Menu starts closed, links not focusable
             * DESKTOP: Menu always visible, links always focusable
             */
            const syncNavForViewport = () => {
                if (mobileNavQuery.matches) {
                    // Mobile: start closed and keep focus out of off-canvas panel
                    closeMenu(false);
                    return;
                }

                // Desktop: nav is always visible and interactive
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
                    // Ignore if inert is not supported
                }
            };

            // Set initial state based on current viewport
            syncNavForViewport();

            // Re-sync when viewport size changes
            try {
                mobileNavQuery.addEventListener('change', syncNavForViewport);
            } catch {
                // Fallback for Safari < 14
                mobileNavQuery.addListener(syncNavForViewport);
            }

            
            // ----------------------------------------------------------------
            // Event Listeners
            // ----------------------------------------------------------------

            // Toggle menu on hamburger click (mobile only)
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

            // Close menu when overlay is clicked (mobile only)
            overlay.addEventListener('click', () => {
                if (!mobileNavQuery.matches) {
                    return;
                }
                closeMenu();
            });

            // Close menu when a navigation link is clicked (mobile only)
            nav.querySelectorAll('a').forEach((link) => {
                link.addEventListener('click', () => {
                    if (!mobileNavQuery.matches) {
                        return;
                    }
                    closeMenu(false);  // Don't restore focus when navigating away
                });
            });

            
            // ----------------------------------------------------------------
            // Global Escape Key Handler
            // ----------------------------------------------------------------
            // Allow users to close menu with Escape key (accessibility)
            // Guard ensures we only bind this once globally
            
            if (!SiteHeader._escapeBound) {
                SiteHeader._escapeBound = true;
                
                document.addEventListener('keydown', (event) => {
                    if (event.key !== 'Escape') {
                        return;
                    }

                    // Find any open menu on the page
                    const activeNav = document.querySelector('.site-nav.is-open');
                    const activeToggle = document.querySelector('.menu-toggle[aria-expanded="true"]');
                    const activeOverlay = document.querySelector('.menu-overlay.is-visible');

                    if (activeNav && activeToggle) {
                        // Close the menu
                        activeNav.classList.remove('is-open');
                        activeNav.setAttribute('aria-hidden', 'true');
                        
                        if (activeOverlay) {
                            activeOverlay.classList.remove('is-visible');
                            activeOverlay.setAttribute('aria-hidden', 'true');
                        }

                        activeToggle.setAttribute('aria-expanded', 'false');
                        document.body.style.overflow = '';

                        // Disable tab stops on links
                        activeNav.querySelectorAll('a').forEach((a) => {
                            a.setAttribute('tabindex', '-1');
                        });

                        // Return focus to toggle button
                        try {
                            activeToggle.focus();
                        } catch {
                            // Ignore focus errors
                        }
                    }
                });
            }
        });
    }
}


// ============================================================================
// SITE FOOTER COMPONENT
// ============================================================================
//
// Simple footer component with copyright and social links.
// Automatically updates the year to the current year.
//
// ============================================================================

class SiteFooter extends HTMLElement {
    
    /**
     * Called when element is inserted into DOM
     * Injects footer HTML with dynamic year
     */
    connectedCallback() {
        const lang = this.getAttribute('lang') || 'en';
        const t = this.getTranslations(lang);
        
        this.innerHTML = `
            <footer class="site-footer" role="contentinfo">
                <div class="footer-inner">
                    <p>© <span id="year"></span> ${t.rights}</p>

                    <div class="social">
                        <a href="https://www.instagram.com/lenkostudio/" target="_blank" rel="noopener">${t.instagram}</a>
                        <a href="https://www.facebook.com/LenkoStudio/" target="_blank" rel="noopener">${t.facebook}</a>
                    </div>
                </div>
            </footer>
        `;
    }
}


// ============================================================================
// COMPONENT REGISTRATION
// ============================================================================
// Register custom elements with the browser so they can be used in HTML

customElements.define('site-header', SiteHeader);
customElements.define('site-footer', SiteFooter);
