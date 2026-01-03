# CSS architecture (LenkoStudio)

This project is a static site with a global stylesheet and a few page-level stylesheets.
The goal is predictable styling with minimal cross-page collisions.

## Core principles

1. **One global theme**
   - Global colors and surfaces come from CSS variables defined in `style.css`.
   - Page styles should **use tokens** (`var(--bg)`, `var(--fg)`, `var(--border)`, etc.) instead of hard-coded color literals.

2. **No global overrides in page CSS**
   - Files in `css/*.css` should not style `html`, `body`, `.site-header`, or `.site-footer`.
   - Page CSS should be scoped to a page root container (e.g. `.portfolio-container`) or a page-specific block.

3. **Prefer component blocks over global selectors**
   - Avoid element selectors like `a`, `button`, `input` in page styles.
   - If you need shared element styling, it belongs in `style.css`.

4. **BEM naming for page components**
   - Use `block__element--modifier` (e.g. `.portfolio-item__title`, `.portfolio-item--portrait`).
   - Keep blocks independent so they can be moved without breaking other pages.

5. **Reduced motion**
   - Prefer disabling *animations* over disabling all transitions.
   - If a component relies on a transition for visibility (e.g. fades), ensure reduced-motion does not trap it in an invisible-but-clickable state.

## File responsibilities

- `style.css`
  - Theme tokens (CSS variables)
  - Global layout primitives (header/footer, typography defaults, shared utilities)
  - Shared components used across pages

- `css/portfolio.css`
  - Portfolio page layout and portfolio-specific components only

- `css/sphere-gallery.css`
  - Sphere gallery modal/component styles only

## Adding a new page stylesheet

1. Add a single page root wrapper class in the HTML (recommended).
2. Scope all rules under that wrapper.
3. Use existing tokens and typography defaults from `style.css`.
4. Avoid overriding global components (header/footer).

## Quick review checklist

- Does this stylesheet touch `body`/`html`? If yes, move to `style.css` or scope it.
- Are there hard-coded colors? Prefer token variables.
- Are selectors scoped to the page root or a block?
- Does reduced-motion still allow the UI to be visible and operable?
