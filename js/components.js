/**
 * Reusable Web Components
 *
 * Goals:
 * - Keep navigation consistent across all pages.
 * - Keep the markup small and cacheable.
 * - Let app.js handle audio behavior (this component only renders the toggle).
 */

class SiteHeader extends HTMLElement {
    connectedCallback() {
        const currentPage = this.getAttribute('current') || '';

        const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
        const soundLabel = soundEnabled ? 'Sound On' : 'Sound Off';

        this.innerHTML = `
            <header class="site-header" role="banner">
                <button class="menu-toggle" type="button" aria-expanded="false" aria-label="Toggle menu">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>

                <nav class="site-nav" aria-label="Primary">
                    <a class="brand" href="index.html"${currentPage === 'home' ? ' aria-current="page"' : ''}>Lenko Studio</a>

                    <ul class="nav-list">
                        <li><a href="portfolio.html"${currentPage === 'portfolio' ? ' aria-current="page"' : ''}>Portfolio</a></li>
                        <li><a href="services.html"${currentPage === 'services' ? ' aria-current="page"' : ''}>Services</a></li>
                        <li><a href="case-studies.html"${currentPage === 'case-studies' ? ' aria-current="page"' : ''}>Case Studies</a></li>
                        <li><a href="pricing.html"${currentPage === 'pricing' ? ' aria-current="page"' : ''}>Pricing</a></li>
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

            const closeMenu = () => {
                nav.classList.remove('is-open');
                overlay.classList.remove('is-visible');
                menuToggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            };

            const openMenu = () => {
                nav.classList.add('is-open');
                overlay.classList.add('is-visible');
                menuToggle.setAttribute('aria-expanded', 'true');
                document.body.style.overflow = 'hidden';
            };

            menuToggle.addEventListener('click', () => {
                const isOpen = nav.classList.contains('is-open');

                if (isOpen) {
                    closeMenu();
                    return;
                }

                openMenu();
            });

            overlay.addEventListener('click', closeMenu);

            nav.querySelectorAll('a').forEach((link) => {
                link.addEventListener('click', closeMenu);
            });

            // Accessibility: let users close the menu with Escape.
            document.addEventListener('keydown', (event) => {
                if (event.key !== 'Escape') {
                    return;
                }

                if (nav.classList.contains('is-open')) {
                    closeMenu();
                    menuToggle.focus();
                }
            });
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
