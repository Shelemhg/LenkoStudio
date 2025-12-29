# Portfolio Page - Code Organization

## 📁 Structure

```
LenkoStudio/
├── css/
│   └── portfolio.css          # Portfolio-specific styles (BEM methodology)
├── js/
│   └── portfolio.js           # Portfolio parallax functionality
├── portfolio.html             # Clean HTML structure only
├── style.css                  # Global/shared styles
└── app.js                     # Global/shared functionality
```

## 🏗️ Architecture Principles

### **Separation of Concerns**
- **HTML**: Structure and content only
- **CSS**: All styling in external stylesheets
- **JavaScript**: All behavior in external scripts

### **BEM Methodology** (Block Element Modifier)
Used for CSS class naming to improve encapsulation and prevent style conflicts:

#### Block: `.portfolio-item`
The main component container

#### Elements (Block__Element):
- `.portfolio-item__image-wrapper` - Image container
- `.portfolio-item__image` - The actual image
- `.portfolio-item__title` - Title section
- `.portfolio-item__heading` - Title heading text
- `.portfolio-item__description` - Description text

#### Benefits:
- **Self-documenting**: Class names clearly show hierarchy
- **Encapsulated**: Styles don't leak to other components
- **Maintainable**: Easy to find and modify specific elements
- **Reusable**: Components can be used elsewhere without conflicts

### **Modular JavaScript**
- Uses revealing module pattern for encapsulation
- Public API with `init()` and `destroy()` methods
- Private functions for internal logic
- requestAnimationFrame for performance

## 📄 File Responsibilities

### `portfolio.html`
- Semantic HTML5 structure
- Accessibility attributes (ARIA, alt text, loading="lazy")
- Links to external CSS/JS
- **No inline styles or scripts**

### `css/portfolio.css`
**Organized by sections:**
1. **Base Styles** - Body, html, fundamentals
2. **Header Overrides** - Page-specific header styling
3. **Portfolio Container** - Layout wrapper
4. **Portfolio Item** - Main component with BEM classes
5. **Footer Overrides** - Page-specific footer styling
6. **Responsive Breakpoints** - Mobile-first media queries
7. **Accessibility** - Reduced motion preferences

**Media Query Strategy:**
- Mobile: `< 768px` (default)
- Tablet: `768px - 1199px`
- Desktop: `≥ 1200px`

### `js/portfolio.js`
**Module: PortfolioParallax**
- **Private**: `updateParallax()`, `handleScroll()`, `ticking` flag
- **Public**: `init()`, `destroy()`
- **Features**:
  - requestAnimationFrame throttling
  - Viewport intersection detection
  - Progressive parallax calculation
  - Memory cleanup method

## 🎯 Benefits of This Organization

### **Developer Experience**
- ✅ Easy to find and edit specific features
- ✅ Clear file responsibilities
- ✅ Reusable components
- ✅ Version control friendly (separate file changes)

### **Performance**
- ✅ External files can be cached by browser
- ✅ Can be minified/compressed separately
- ✅ Lazy loading capable
- ✅ CDN-friendly

### **Maintainability**
- ✅ Industry-standard structure
- ✅ Self-documenting code
- ✅ Easy to test individual modules
- ✅ Clear dependencies

### **Scalability**
- ✅ Easy to add new portfolio items
- ✅ Component-based architecture
- ✅ Can extend to other pages
- ✅ Team collaboration friendly

## 🔄 Future Enhancements

Consider these improvements as the project grows:

1. **CSS Preprocessor** (Sass/LESS)
   - Variables for colors, spacing
   - Mixins for repeated patterns
   - Nested selectors matching BEM

2. **Build Process**
   - Minification (CSS/JS)
   - Autoprefixer for browser compatibility
   - Asset optimization

3. **Component Library**
   - Extract reusable components
   - Create variants using BEM modifiers
   - Documentation with examples

4. **TypeScript**
   - Type safety for JavaScript
   - Better IDE support
   - Clearer API contracts

## 📚 Resources

- **BEM Methodology**: https://getbem.com/
- **CSS Architecture**: https://web.dev/articles/css-architecture
- **JavaScript Modules**: https://javascript.info/modules-intro
- **Web Performance**: https://web.dev/articles/optimize-css
