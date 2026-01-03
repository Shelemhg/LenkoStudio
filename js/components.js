/**
 * Reusable Web Components
 *
 * Goals:
 * - Keep navigation consistent across all pages.
 * - Keep the markup small and cacheable.
 * - Let app.js handle audio behavior (this component only renders the toggle).
 *
 * Why Web Components?
 * - Reusability: Define once, use across all HTML pages without duplication.
 * - Encapsulation: Each component manages its own DOM and behavior.
 * - Standards-based: Uses native browser APIs (Custom Elements) for better performance.
 * - Maintainability: Changes to header/footer propagate automatically to all pages.
 */

class SiteHeader extends HTMLElement {
    // Prevent duplicate event listeners across multiple instances.
    // Since Escape handler is document-level, we only bind it once.
    static _escapeBound = false;

    // connectedCallback is a Custom Element lifecycle method that runs when the
    // element is inserted into the DOM. This is where we render the header markup
    // and initialize all interactive behaviors.
    connectedCallback() {
        const currentPage = this.getAttribute('current') || '';

        const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
        const soundLabel = soundEnabled ? 'Sound On' : 'Sound Off';

        this.innerHTML = `
            <header class="site-header" role="banner">
                <!-- Hamburger menu button: 3 spans transform into an X when open.
                     CSS handles the animation via .is-open class on parent nav. -->
                <button class="menu-toggle" type="button" aria-expanded="false" aria-label="Toggle menu" aria-controls="primaryNav">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>

                <nav id="primaryNav" class="site-nav" aria-label="Primary" aria-hidden="false">
                    <a class="brand" href="index.html"${currentPage === 'home' ? ' aria-current="page"' : ''}>Lenko Studio</a>

                    <ul class="nav-list">
                        <li><a href="portfolio.html"${currentPage === 'portfolio' ? ' aria-current="page"' : ''}>Portfolio</a></li>
                        <li><a href="about.html"${currentPage === 'about' ? ' aria-current="page"' : ''}>About</a></li>
                        <li><a href="contact.html"${currentPage === 'contact' ? ' aria-current="page"' : ''}>Contact</a></li>
                        <li><a class="adam-link" href="https://adam.lenkostudio.com" target="_blank" rel="noopener">For Creators — ADAM</a></li>
                    </ul>
                </nav>

                <button id="soundToggle" class="sound-toggle" type="button" aria-pressed="${soundEnabled ? 'true' : 'false'}" aria-label="${soundLabel}">${soundLabel}</button>
            </header>

            <div class="menu-overlay" aria-hidden="true"></div>
        `;

        // Mobile menu state management:
        // - On mobile (<768px): nav slides in/out with overlay, hamburger animates
        // - On desktop: nav always visible, hamburger hidden via CSS
        // We keep all this logic in the component so every page gets consistent behavior.
        // requestAnimationFrame ensures DOM is ready before querying elements.
        requestAnimationFrame(() => {
            const menuToggle = this.querySelector('.menu-toggle');
            const nav = this.querySelector('.site-nav');
            const overlay = this.querySelector('.menu-overlay');

            if (!menuToggle || !nav || !overlay) {
                return;
            }

            const getFocusableLinks = () => Array.from(nav.querySelectorAll('a'));

            // Focus management for accessibility:
            // When menu is closed on mobile, links should not be keyboard-navigable
            // (they're off-screen). We remove them from tab order via tabindex="-1".
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

                    // Disable tab stops when menu is closed (especially important on mobile)
                    const current = a.getAttribute('tabindex');
                    if (current !== null) {
                        a.setAttribute('data-prev-tabindex', current);
                    }
                    a.setAttribute('tabindex', '-1');
                });

                // The `inert` attribute is the modern way to make entire subtrees
                // non-interactive. It's more robust than tabindex alone, but not all
                // browsers support it yet. We apply it when available, fall back gracefully.
                try {
                    if (!enabled) {
                        nav.setAttribute('inert', '');
                    } else {
                        nav.removeAttribute('inert');
                    }
                } catch {
                    // inert not supported; tabindex handling above still helps.
                }
            }

            // Close menu state:
            // 1. Remove visual classes (slide-out animation via CSS)
            // 2. Update ARIA attributes for screen readers
            // 3. Restore body scroll
            // 4. Remove keyboard access to hidden links
            // 5. Optionally return focus to hamburger button
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

            // Open menu state:
            // 1. Add visual classes (slide-in animation via CSS)
            // 2. Update ARIA attributes
            // 3. Prevent body scroll (menu takes full viewport)
            // 4. Enable keyboard access to links
            // 5. Move focus to first link for keyboard users
            const openMenu = () => {
                nav.classList.add('is-open');
                nav.setAttribute('aria-hidden', 'false');
                overlay.classList.add('is-visible');
                overlay.setAttribute('aria-hidden', 'false');
                menuToggle.setAttribute('aria-expanded', 'true');
                document.body.style.overflow = 'hidden';

                setNavFocusable(true);

                // Move focus to first link for keyboard users.
                const first = getFocusableLinks()[0];
                if (first && typeof first.focus === 'function') {
                    first.focus();
                }
            };

            // Media query to detect mobile vs desktop viewport.
            // This breakpoint (768px) matches the CSS breakpoint.
            const mobileNavQuery = window.matchMedia('(max-width: 768px)');

            // Synchronize menu state with viewport size:
            // - Mobile: Close menu and disable keyboard nav (off-canvas panel)
            // - Desktop: Always show nav, always allow keyboard access
            // This prevents state bugs when resizing from mobile to desktop.
            const syncNavForViewport = () => {
                if (mobileNavQuery.matches) {
                    // Mobile: start closed and keep focus out of the off-canvas panel.
                    closeMenu(false);
                    return;
                }

                // Desktop: nav is always visible + interactive.
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

            // Ensure correct initial state when component loads (handles page refresh,
            // back/forward navigation, or component being added dynamically).
            syncNavForViewport();

            // Listen for viewport size changes (device rotation, window resize).
            // Modern browsers use addEventListener, older Safari uses addListener.
            try {
                mobileNavQuery.addEventListener('change', syncNavForViewport);
            } catch {
                // Safari < 14 fallback
                mobileNavQuery.addListener(syncNavForViewport);
            }

            // Hamburger button click: toggle menu open/closed (mobile only).
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

            // Click on dark overlay: close menu (common mobile UI pattern).
            overlay.addEventListener('click', () => {
                if (!mobileNavQuery.matches) {
                    return;
                }
                closeMenu();
            });

            // When user clicks a nav link, close the menu (mobile only).
            // This provides better UX: user taps link, menu slides away, page navigates.
            nav.querySelectorAll('a').forEach((link) => {
                link.addEventListener('click', () => {
                    if (!mobileNavQuery.matches) {
                        return;
                    }
                    closeMenu(false);
                });
            });

            // Accessibility: Escape key closes the menu (WCAG best practice).
            // This handler is document-level, so we use a static flag to prevent
            // duplicate bindings if multiple <site-header> instances exist
            // (though typically there's only one per page).
            if (!SiteHeader._escapeBound) {
                SiteHeader._escapeBound = true;
                document.addEventListener('keydown', (event) => {
                    // Only handle Escape key presses.
                    // Only handle Escape key presses.
                    if (event.key !== 'Escape') {
                        return;
                    }

                    // Find currently open menu by querying the DOM.
                    // This works even if multiple headers exist.
                    const activeNav = document.querySelector('.site-nav.is-open');
                    const activeToggle = document.querySelector('.menu-toggle[aria-expanded="true"]');
                    const activeOverlay = document.querySelector('.menu-overlay.is-visible');

                    // If menu is open, close it and restore focus to hamburger button.
                    if (activeNav && activeToggle) {
                        activeNav.classList.remove('is-open');
                        activeNav.setAttribute('aria-hidden', 'true');
                        if (activeOverlay) {
                            activeOverlay.classList.remove('is-visible');
                            activeOverlay.setAttribute('aria-hidden', 'true');
                        }

                        activeToggle.setAttribute('aria-expanded', 'false');
                        document.body.style.overflow = '';

                        // Also disable tab stops.
                        activeNav.querySelectorAll('a').forEach((a) => a.setAttribute('tabindex', '-1'));

                        try {
                            activeToggle.focus();
                        } catch {
                            // ignore
                        }
                    }
                });
            }
        });
    }
}

// ============================================
// SITE FOOTER COMPONENT
// ============================================
// Simple component with no interactive behavior.
// Just renders consistent footer markup across all pages.
class SiteFooter extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <footer class="site-footer" role="contentinfo">
                <div class="footer-inner">
                    <p>© <span id="year"></span> Lenko Studio</p>

                    <div class="social">
                        <a href="https://www.instagram.com/lenkostudio/" target="_blank" rel="noopener">Instagram</a>
                        <a href="https://www.facebook.com/LenkoStudio/" target="_blank" rel="noopener">Facebook</a>
                    </div>
                </div>
            </footer>
        `;
    }
}

// ============================================
// REGISTER COMPONENTS
// ============================================
// Register custom elements so they can be used in HTML as <site-header> and <site-footer>.
// Tag names must contain a hyphen (per Web Components spec) to avoid conflicts with future HTML elements.
customElements.define('site-header', SiteHeader);
customElements.define('site-footer', SiteFooter);
