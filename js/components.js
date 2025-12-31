/**
 * Reusable Web Components
 * Native browser feature - fast, cacheable, no framework needed
 */

// ============================================
// SITE HEADER COMPONENT
// ============================================
class SiteHeader extends HTMLElement {
  connectedCallback() {
    const currentPage = this.getAttribute('current') || '';
    const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
    const soundLabel = soundEnabled ? 'Sound On' : 'Sound Off';
    const soundPressed = soundEnabled ? 'true' : 'false';
    
    this.innerHTML = `
      <a class="skip-link" href="#main">Skip to content</a>
      <header class="site-header" role="banner">
        <button class="menu-toggle" aria-expanded="false" aria-label="Toggle menu">
          <span></span>
          <span></span>
          <span></span>
        </button>
        <nav class="site-nav" aria-label="Primary">
          <a class="brand" href="index.html"${currentPage === 'home' ? ' aria-current="page"' : ''}>Lenko Studio</a>
          <ul class="nav-list">
            <li><a href="portfolio.html"${currentPage === 'portfolio' ? ' aria-current="page"' : ''}>Portfolio</a></li>
            <!-- <li><a href="services.html"${currentPage === 'services' ? ' aria-current="page"' : ''}>Services</a></li> -->
            <!-- <li><a href="case-studies.html"${currentPage === 'case-studies' ? ' aria-current="page"' : ''}>Case Studies</a></li> -->
            <!-- <li><a href="pricing.html"${currentPage === 'pricing' ? ' aria-current="page"' : ''}>Pricing</a></li> -->
            <li><a href="about.html"${currentPage === 'about' ? ' aria-current="page"' : ''}>About</a></li>
            <li><a href="contact.html"${currentPage === 'contact' ? ' aria-current="page"' : ''}>Contact</a></li>
            <!-- <li><a class="adam-link" href="https://adam.lenkostudio.com">For Creators — ADAM</a></li> -->
          </ul>
        </nav>
        <button id="soundToggle" class="sound-toggle" aria-pressed="${soundPressed}" aria-label="${soundLabel}">${soundLabel}</button>
      </header>
      <div class="menu-overlay" aria-hidden="true"></div>
    `;
    
    // Initialize hamburger menu functionality after DOM is ready
    requestAnimationFrame(() => {
      const menuToggle = this.querySelector('.menu-toggle');
      const nav = this.querySelector('.site-nav');
      const overlay = this.querySelector('.menu-overlay');
      
      if (menuToggle && nav && overlay) {
        // Toggle menu open/close
        menuToggle.addEventListener('click', () => {
          const isOpen = nav.classList.contains('is-open');
          
          if (isOpen) {
            // Close menu
            nav.classList.remove('is-open');
            overlay.classList.remove('is-visible');
            menuToggle.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
          } else {
            // Open menu
            nav.classList.add('is-open');
            overlay.classList.add('is-visible');
            menuToggle.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
          }
        });
        
        // Close menu when clicking overlay
        overlay.addEventListener('click', () => {
          nav.classList.remove('is-open');
          overlay.classList.remove('is-visible');
          menuToggle.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        });
        
        // Close menu when clicking a nav link
        const navLinks = nav.querySelectorAll('a');
        navLinks.forEach(link => {
          link.addEventListener('click', () => {
            nav.classList.remove('is-open');
            overlay.classList.remove('is-visible');
            menuToggle.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
          });
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
          <p>© <span class="year">${new Date().getFullYear()}</span> Lenko Studio</p>
          
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
