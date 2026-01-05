# i18n Quick Reference

## Quick Commands

```bash
# Generate all language versions (recommended)
python scripts/generate_i18n_all.py

# Test implementation
python scripts/test_i18n.py

# Serve locally
python -m http.server 8000
```

## URLs

**English (default):**
- http://localhost:8000/index.html
- http://localhost:8000/about.html
- http://localhost:8000/contact.html
- http://localhost:8000/portfolio.html
- http://localhost:8000/project.html

**Spanish:**
- http://localhost:8000/es/index.html
- http://localhost:8000/es/about.html
- http://localhost:8000/es/contact.html
- http://localhost:8000/es/portfolio.html
- http://localhost:8000/es/project.html

## Adding New Translation Keys

1. **Edit `i18n/en.json`:**
```json
{
  "new_section": {
    "key": "English value"
  }
}
```

2. **Edit `i18n/es.json`:**
```json
{
  "new_section": {
    "key": "Spanish value"
  }
}
```

3. **Use in template:**
```python
html = f'''
<h2>{t['new_section']['key']}</h2>
'''
```

4. **Generate:**
```bash
python scripts/generate_i18n.py
```

## HTML Usage

### Headers and Footers

```html
<!-- English page -->
<site-header current="project" lang="en"></site-header>
<site-footer lang="en"></site-footer>

<!-- Spanish page -->
<site-header current="project" lang="es"></site-header>
<site-footer lang="es"></site-footer>
```

### Asset Paths

Use `asset_prefix` variable in generator:

```python
asset_prefix = "" if is_default else "../"

# Then use in all paths:
<link rel="stylesheet" href="{asset_prefix}style.css" />
<script src="{asset_prefix}js/app.js"></script>
<a href="{asset_prefix}portfolio.html">Portfolio</a>
```

## Component Translations

Translations are embedded in `js/components.js`:

```javascript
getTranslations(lang) {
    const translations = {
        en: { portfolio: 'Portfolio' },
        es: { portfolio: 'Portafolio' }
    };
    return translations[lang] || translations.en;
}
```

## SEO Tags Template

Every page should have:

```html
<html lang="en">  <!-- or "es" -->
<head>
    <title>Site Title — Page Title</title>
    <meta name="description" content="..." />
    
    <!-- hreflang tags -->
    <link rel="alternate" hreflang="en" href="page.html" />
    <link rel="alternate" hreflang="es" href="es/page.html" />
    <link rel="alternate" hreflang="x-default" href="page.html" />
</head>
```

## File Structure

```
/project.html           ← English (default)
/es/project.html        ← Spanish
/i18n/en.json          ← English translations
/i18n/es.json          ← Spanish translations
/scripts/generate_i18n.py  ← Build script
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Paths broken in Spanish | Check `asset_prefix = "../"` |
| Translation not showing | Re-run `generate_i18n.py` |
| Component not translating | Check `lang` attribute |
| Language switcher missing | Verify header has `lang` attribute |

## Deployment Checklist

- [ ] Translations updated in both `en.json` and `es.json`
- [ ] Generated files with `python scripts/generate_i18n.py`
- [ ] Tested both language versions locally
- [ ] Verified language switcher works
- [ ] Checked all asset paths work
- [ ] Validated HTML with W3C
- [ ] Committed both source and generated files

## Performance

- **LCP:** No impact (static HTML)
- **CLS:** No layout shift
- **FID:** Instant interactivity
- **CDN:** Both languages cached separately
- **Bundle:** 0 KB JavaScript for i18n

---

For full documentation, see [doc/i18n-guide.md](i18n-guide.md)
