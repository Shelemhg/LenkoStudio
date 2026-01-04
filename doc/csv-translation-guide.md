# CSV Translation System Guide

## Overview

LenkoStudio uses a **CSV-based translation system with HTML element IDs** for easy content management and quick traceability. All translations are stored in `i18n/translations.csv` and can be edited with any spreadsheet software (Excel, Google Sheets, etc.).

## CSV File Structure

Location: `i18n/translations.csv`

Format:
```csv
page,address,status,id,en,es
about,/about.html,active,story-p1,"<strong>Lenko Studio, a distinct style.</strong> From...","<strong>Lenko Studio, un estilo distintivo.</strong> Desde..."
contact,/contact.html,active,contact-intro,"Ready to book, ask a question...","¿Listo para reservar, hacer una pregunta..."
about,/about.html,deleted,old-id,Old content,Contenido antiguo
```

### Columns:
- **page**: HTML filename without extension (e.g., `about`, `contact`, `index`)
- **address**: URL path to the page (e.g., `/about.html`, `/contact.html`)
- **status**: `active` if ID exists in HTML, `deleted` if removed but kept for reference
- **id**: HTML element ID that matches the `id` attribute in the HTML (e.g., `story-p1`)
- **en**: English version of the content
- **es**: Spanish version of the content

## Automatic CSV Synchronization

### The Sync Script

Run `python scripts/sync_translations.py` to automatically:
- Scan all HTML files for elements with IDs
- Extract current English and Spanish content
- Update the CSV with page names and addresses
- Mark IDs as `active` (found in HTML) or `deleted` (not found)
- Preserve existing translations

**Usage:**
```bash
python scripts/sync_translations.py
```

**Output:**
```
🔄 Syncing translation CSV with HTML files...

📄 Scanning HTML files...
   ✓ Found 40 elements with IDs across all pages

📊 Loading existing CSV...
   ✓ Loaded 79 existing entries

🔄 Merging data...
   ✓ 36 active translations
   ✓ 59 deleted entries

💾 Writing updated CSV...
   ✓ Saved to i18n\translations.csv

📋 Summary by page:
   about        → 14 active IDs
   contact      → 11 active IDs
   index        → 4 active IDs
   portfolio    → 1 active IDs
   project      → 6 active IDs
```

### When to Run Sync Script

Run the sync script when:
- ✅ You add new IDs to HTML files
- ✅ You remove or rename IDs in HTML
- ✅ You want to update the CSV with current HTML content
- ✅ You want to see which translations are still in use

**Workflow:**
1. Edit your HTML files (add/remove/change IDs)
2. Run: `python scripts/sync_translations.py`
3. Review the updated CSV (check for missing translations)
4. Add Spanish translations for any new entries
5. Run: `python scripts/generate_i18n_all.py`

## How the ID System Works

### 1. HTML Elements Have IDs

In your HTML files, translatable elements have unique ID attributes:

```html
<!-- about.html -->
<h1 id="about-page-title">About Us</h1>
<p id="story-p1">
    <strong>Lenko Studio, a distinct style.</strong> From the busy streets...
</p>
<li id="approach-calm">
    <strong>Calm direction:</strong> Relaxed sessions...
</li>
```

### 2. CSV Uses Those Same IDs

The CSV file uses those exact IDs to map translations:

```csv
id,en,es
about-page-title,About Us,Acerca de Nosotros
story-p1,"<strong>Lenko Studio, a distinct style.</strong> From the busy streets...","<strong>Lenko Studio, un estilo distintivo.</strong> Desde las calles..."
approach-calm,<strong>Calm direction:</strong> Relaxed sessions...,<strong>Dirección tranquila:</strong> Sesiones relajadas...
```

### 3. Generation Script Finds Elements by ID

When you run `python scripts/generate_i18n_all.py`, the script:
1. Loads the CSV translations
2. Finds HTML elements with matching `id` attributes
3. Replaces their content with the translated version
4. Preserves all HTML structure and attributes

## Benefits of ID-Based System

✅ **Quick Traceability**: See `story-p1` in CSV? Search for `id="story-p1"` in HTML  
✅ **No Ambiguity**: IDs are unique - no risk of replacing wrong content  
✅ **Easy Debugging**: Browser dev tools show element IDs  
✅ **Maintainable**: Clear connection between HTML and translations  
✅ **Precise**: Only translates intended elements, not accidental matches

## How to Add New Translations

### 1. Add ID to HTML Element

Open the source HTML file (e.g., `about.html`) and add an `id` attribute:

```html
<!-- Before -->
<p>Some new content that needs translation.</p>

<!-- After -->
<p id="new-content">Some new content that needs translation.</p>
```

**ID Naming Convention:**
- Use lowercase with hyphens: `section-name-element`
- Be descriptive: `story-p1`, `contact-intro`, `offer-weddings`
- Group related IDs: `approach-calm`, `approach-color`, `approach-story`

### 2. Add Entry to CSV

Open `i18n/translations.csv` and add a new row:

```csv
id,en,es
new-content,Some new content that needs translation.,Algún contenido nuevo que necesita traducción.
```

### 3. Regenerate Pages

Run the generation script:

```bash
python scripts/generate_i18n_all.py
```

### 4. Verify in Browser

- Check English: http://localhost:8000/about.html
- Check Spanish: http://localhost:8000/es/about.html
- Use browser dev tools to inspect the element (you'll see the ID)

## Finding Translation Locations

### Quick Search Method

**In CSV, see ID → Want to find in HTML?**

1. Copy the ID from CSV (e.g., `story-p1`)
2. Search in your HTML file for `id="story-p1"`
3. That's exactly where the translation is used!

**Example:**
```csv
id,en,es
approach-calm,<strong>Calm direction:</strong> Relaxed sessions...,<strong>Dirección tranquila:</strong> Sesiones relajadas...
```

Search `about.html` for `id="approach-calm"`:
```html
<li id="approach-calm"><strong>Calm direction:</strong> Relaxed sessions that keep you present and comfortable.</li>
```

## Current Translation Coverage

### About Page (`about.html`)
- `about-page-title` - Main heading
- `story-p1` - First story paragraph
- `story-p2` - Second story paragraph (weddings)
- `approach-calm` - Calm direction list item
- `approach-color` - Editorial color list item
- `approach-story` - Story first list item
- `approach-collab` - Close collaboration list item
- `approach-global` - Global reach list item
- `offer-weddings` - Weddings service
- `offer-portraits` - Portraits service
- `offer-projects` - Projects service

### Contact Page (`contact.html`)
- `contact-page-title` - Main heading
- `contact-intro` - Introduction paragraph
- `email-desc` - Email method description
- `whatsapp-desc` - WhatsApp method description
- `contact-type` - Type of shoot list item
- `contact-date` - Preferred date list item
- `contact-refs` - Moodboard references list item
- `contact-use` - Photo usage list item
- `contact-reply` - Reply expectation text

### 2. Important CSV Rules

- **Quotes for Complex Content**: Use double quotes when content contains commas or special characters:
  ```csv
  key,en,es
  intro_text,"Welcome, visitor!","¡Bienvenido, visitante!"
  ```

- **HTML is Preserved**: You can include HTML tags in translations:
  ```csv
  key,en,es
  styled_text,<strong>Bold text</strong> and more,<strong>Texto en negrita</strong> y más
  ```

- **Exact Matching**: The script matches exact text, including punctuation. Make sure the English column matches exactly what's in your HTML files.

### 3. Regenerate Pages

After updating the CSV, run the generation script:

```bash
python scripts/generate_i18n_all.py
```

This will:
1. Read all translations from the CSV
2. Generate all pages in both languages
3. Apply translations while preserving HTML structure

## Current Translation Coverage

The CSV currently includes translations for:

### Navigation & Common Elements
- Site title and tagline
- Navigation links (Home, Portfolio, About, Contact, Project)
- Common buttons (Book a Shoot, Learn More, etc.)
- Footer content

### About Page
- Page title and headings
- Story paragraphs (complete)
- Approach & Values list items
- What We Offer section

### Contact Page
- Introduction text
- Contact method descriptions
- Form guidance text
- Response expectations

### Accessibility (ARIA Labels)
- Open image
- Close
- Previous image
- Next image

## Tips for Translators

### 1. Maintain Formatting
Keep the same formatting and HTML structure:
```csv
# Good ✓
key,en,es
button,<strong>Click</strong> here,<strong>Haz clic</strong> aquí

# Bad ✗ (different structure)
key,en,es
button,<strong>Click</strong> here,<em>Haz clic aquí</em>
```

### 2. Preserve Punctuation Style
Match punctuation, especially for questions and exclamations:
```csv
key,en,es
question,Ready to start?,¿Listo para empezar?
```

### 3. Keep Brand Names Consistent
Don't translate brand names like "Lenko Studio":
```csv
key,en,es
brand_intro,Welcome to Lenko Studio,Bienvenido a Lenko Studio
```

### 4. Test After Changes
Always test both language versions after updating translations:
- Visit http://localhost:8000/about.html (English)
- Visit http://localhost:8000/es/about.html (Spanish)
- Use the language switcher (🌐 EN / 🌐 ES)

## Workflow for Content Updates

### Adding a New Page Section

1. **Write the English content** in the source HTML file (e.g., `about.html`)

2. **Extract translatable text** and add to CSV:
   ```csv
   key,en,es
   new_section_heading,Our Philosophy,Nuestra Filosofía
   new_section_text,"We believe in authentic storytelling.","Creemos en la narrativa auténtica."
   ```

3. **Generate pages**:
   ```bash
   python scripts/generate_i18n_all.py
   ```

4. **Verify** both languages load correctly

### Updating Existing Content

1. **Find the key** in `translations.csv` (search for the English text)

2. **Update the translation** in the `es` column

3. **Regenerate**:
   ```bash
   python scripts/generate_i18n_all.py
   ```

## Troubleshooting

### Content Not Translating?

**Problem**: Spanish page shows English text

**Solutions**:
1. Check the CSV has the exact English text (including punctuation and spaces)
2. Verify the CSV uses proper quoting for text with commas
3. Regenerate pages after CSV changes
4. Clear browser cache if testing locally

### Special Characters?

**Problem**: Accents or special characters display incorrectly

**Solution**: Ensure the CSV file is saved with UTF-8 encoding. Most text editors and spreadsheet apps support this.

### Translation Spacing Issues?

**Problem**: Missing space after translated bold text

**Example**: `<strong>Text:</strong>More text` becomes `<strong>Text:</strong>Más texto`

**Solution**: Include the space in the CSV:
```csv
key,en,es
label_text,<strong>Label:</strong> Value,<strong>Etiqueta:</strong> Valor
#                              ^space here              ^space here
```

## Advanced: Adding More Languages

To add more languages (e.g., French):

1. **Add a column** to `translations.csv`:
   ```csv
   key,en,es,fr
   about_heading,About Us,Acerca de Nosotros,À Propos
   ```

2. **Update** `scripts/generate_i18n_all.py`:
   ```python
   # Add 'fr' to languages list
   languages = ["en", "es", "fr"]
   ```

3. **Create JSON translations** for metadata (titles, meta descriptions):
   - Copy `i18n/es.json` to `i18n/fr.json`
   - Translate the JSON values

4. **Regenerate** all pages

## Benefits of CSV System

✅ **Non-technical friendly**: Edit in Excel, Google Sheets, or any text editor  
✅ **Version control**: Easy to track changes with git  
✅ **Centralized**: All translations in one place  
✅ **Scalable**: Add new languages by adding columns  
✅ **Fast**: Static generation means zero runtime overhead  
✅ **Consistent**: Use same translation across multiple pages with one entry

## Files Modified

- **CSV translations**: `i18n/translations.csv`
- **Generation script**: `scripts/generate_i18n_all.py`
- **JSON metadata**: `i18n/en.json`, `i18n/es.json` (for page titles and meta)

## Need Help?

1. Check that CSV syntax is correct (commas, quotes)
2. Verify CSV is UTF-8 encoded
3. Test with simple text before complex HTML
4. Review generated files in `es/` directory
5. Use browser dev tools to inspect translated content

---

Last updated: January 2026
