# LenkoStudio UX Fixes Log (started 2025-12-31)

This file tracks every usability/accessibility/performance fix applied, with the motivation and the exact files changed.

## 2025-12-31
- Planned focus areas: navigation accessibility, home intro click friction, PJAX lifecycle cleanup, sphere modal keyboard support, safer localStorage usage, forms validation, remove inline styles, reduce CLS, reduce duplicate-content confusion.

### Implemented
- Navigation (mobile menu): prevent off-canvas link tabbing, add `aria-controls`, toggle `aria-hidden`, restore/move focus on open/close, and guard Escape binding.
	- Files: js/nav.js, style.css
- Home intro: remove CTA click-blocking during intro and add `HomeIntro.destroy()` for PJAX cleanup; also harden localStorage reads.
	- Files: style.css, js/home.js, app.js
- PJAX lifecycle: add `cleanupPageFeatures()` and call before DOM/script swaps.
	- Files: app.js
- Sphere modal: add keyboard activation for items, real focus trap, stop animation loop when idle, and add `SphereGallery.destroy()` to remove document listeners under PJAX.
	- Files: js/sphere-gallery.js, app.js
- Contact + Pricing: remove inline styles; move to centralized CSS; add meta descriptions.
	- Files: contact.html, pricing.html, style.css
- Case Studies: add `width/height` + `loading/decoding` to images to reduce CLS; add meta description.
	- Files: case-studies.html
- Duplicate-content pages: convert `portraits.html`, `portraits-info.html`, `3dWedding.html` into canonical redirects (meta refresh + canonical + noindex) to avoid confusion and duplicate indexing.
	- Files: portraits.html, portraits-info.html, 3dWedding.html
- Forms: strengthen email validation and add `aria-invalid`; avoid wiping contact form content after launching `mailto:`.
	- Files: app.js

### 2025-12-31 (follow-up)
- Unified home intro behavior across desktop + mobile:
	- Always show the black overlay intro on mobile (removed mobile-only `display:none`).
	- Removed audio-preference-based auto-skip logic so mobile no longer skips by default.
	- Files: style.css, js/home.js

### 2025-12-31 (ops)
- Set footer year to 2026.
	- Files: app.js

### 2025-12-31 (bugfix)
- Fixed sphere gallery rotation regression: restoring the original always-running RAF loop so drag rotations visibly update (matches pre-change behavior from commit 9aaff9f).
	- Files: js/sphere-gallery.js

### 2025-12-31 (content)
- Hid Services / Case Studies / Pricing pages:
	- Removed header navigation links.
	- Converted `services.html`, `pricing.html`, and `case-studies.html` into `noindex` redirect stubs to `index.html`.
	- Updated redirect stubs `portraits.html` and `3dWedding.html` to redirect to `portfolio.html` instead of hidden pages.
	- Files: js/nav.js, services.html, pricing.html, case-studies.html, portraits.html, 3dWedding.html

### 2025-12-31 (content)
- Modernized Contact page and simplified contact methods:
	- Removed the contact form and local “Download Saved” workflow.
	- Set the only contact methods to `mailto:hi@lenkostudio.com` and WhatsApp.
	- Files: contact.html, style.css

### 2025-12-31 (portfolio)
- Persist selected portfolio cover images and add a reset control:
	- When a user selects an image as a category cover from the sphere modal, the selection is saved to localStorage and restored on refresh.
	- Added a subtle “Reset pictures” button at the top of the portfolio page to clear stored selections.
	- Files: portfolio.html, css/portfolio.css, js/sphere-gallery.js
