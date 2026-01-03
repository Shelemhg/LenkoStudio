/**
 * Reusable Web Components
 *
 * Goals:
 * - Keep navigation consistent across all pages.
 * - Keep the markup small and cacheable.
 * - Let app.js handle audio behavior (this component only renders the toggle).
 */

class SiteHeader extends HTMLElement {
    static _escapeBound = false;

    connectedCallback() {
        const currentPage = this.getAttribute('current') || '';

        const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
        const soundLabel = soundEnabled ? 'Sound On' : 'Sound Off';

        this.innerHTML = `
            <header class="site-header" role="banner">
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

        // Hamburger menu behavior is purely presentational (open/close the nav panel).
        // We keep it here so every page automatically gets the same mobile navigation.
        requestAnimationFrame(() => {
            const menuToggle = this.querySelector('.menu-toggle');
            const nav = this.querySelector('.site-nav');
            const overlay = this.querySelector('.menu-overlay');

            if (!menuToggle || !nav || !overlay) {
                return;
            }

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

                    // Disable tab stops when menu is closed (especially important on mobile)
                    const current = a.getAttribute('tabindex');
                    if (current !== null) {
                        a.setAttribute('data-prev-tabindex', current);
                    }
                    a.setAttribute('tabindex', '-1');
                });

                // Prefer `inert` when available.
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

                // Move focus to first link for keyboard users.
                const first = getFocusableLinks()[0];
                if (first && typeof first.focus === 'function') {
                    first.focus();
                }
            };

            const mobileNavQuery = window.matchMedia('(max-width: 768px)');

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

            // Ensure correct initial state for current viewport.
            syncNavForViewport();

            try {
                mobileNavQuery.addEventListener('change', syncNavForViewport);
            } catch {
                // Safari < 14 fallback
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

            // Accessibility: let users close the menu with Escape.
            // Guard so we don't bind multiple times if the component re-renders.
            if (!SiteHeader._escapeBound) {
                SiteHeader._escapeBound = true;
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
customElements.define('site-header', SiteHeader);
customElements.define('site-footer', SiteFooter);
