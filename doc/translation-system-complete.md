# Translation System: Complete Guide

## Overview

The LenkoStudio translation system is fully automated with CSV-based content management, HTML element ID tracking, and automatic synchronization.

## System Architecture

```
HTML Files (with IDs)
       ↓
Sync Script (scans HTML)
       ↓
CSV File (page, address, status, id, en, es)
       ↓
Generation Script (creates Spanish pages)
       ↓
Bilingual Website (English + Spanish)
```

## CSV Structure

**File:** `i18n/translations.csv`

**Columns:**
```csv
page,address,status,id,en,es
about,/about.html,active,story-p1,English text,Spanish text
```

1. **page** - HTML filename without extension (`about`, `contact`, `index`)
2. **address** - URL path to the page (`/about.html`, `/es/about.html`)
3. **status** - `active` (found in HTML) or `deleted` (removed from HTML)
4. **id** - HTML element's `id` attribute value
5. **en** - English content extracted from HTML
6. **es** - Spanish translation

## Two Main Scripts

### 1. Sync Script: `scripts/sync_translations.py`

**Purpose:** Scan HTML files and update CSV with current content

**What it does:**
- Scans all HTML files in root and `es/` directory
- Finds all elements with `id` attributes
- Extracts their content (English and Spanish)
- Updates CSV with page names, addresses, and status
- Marks IDs as `active` if found, `deleted` if not

**When to run:**
- After adding new IDs to HTML
- After removing or renaming IDs
- To audit which translations are in use
- To extract current content from HTML

**Command:**
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
```

### 2. Generation Script: `scripts/generate_i18n_all.py`

**Purpose:** Generate Spanish versions of all pages using CSV translations

**What it does:**
- Loads translations from CSV (skips `deleted` entries)
- Reads English HTML files
- Finds elements by ID and replaces content
- Updates asset paths for Spanish directory
- Generates Spanish pages in `es/` folder

**When to run:**
- After adding/updating translations in CSV
- After syncing CSV with HTML
- Before deploying to production

**Command:**
```bash
python scripts/generate_i18n_all.py
```

**Output:**
```
🌍 Generating multilingual pages...
📊 Loading CSV translations...
   ✓ Loaded 36 translation keys
📄 Processing EN...
   ✓ Generated: index.html
   ✓ Generated: about.html
   ✓ Generated: contact.html
   ✓ Generated: portfolio.html
   ✓ Generated: project.html
📄 Processing ES...
   ✓ Generated: es\index.html
   ✓ Generated: es\about.html
   ✓ Generated: es\contact.html
   ✓ Generated: es\portfolio.html
   ✓ Generated: es\project.html
```

## Complete Workflow

### Adding New Content

1. **Edit HTML file** (add ID to element):
   ```html
   <p id="new-feature">This is a new feature.</p>
   ```

2. **Run sync script** (auto-extracts content):
   ```bash
   python scripts/sync_translations.py
   ```

3. **Open CSV** - Find the new entry:
   ```csv
   page,address,status,id,en,es
   about,/about.html,active,new-feature,This is a new feature.,
   ```

4. **Add Spanish translation**:
   ```csv
   about,/about.html,active,new-feature,This is a new feature.,Esta es una nueva característica.
   ```

5. **Generate pages**:
   ```bash
   python scripts/generate_i18n_all.py
   ```

6. **Test**:
   - English: http://localhost:8000/about.html
   - Spanish: http://localhost:8000/es/about.html

### Updating Existing Content

1. **Edit HTML** (change English text)
2. **Run sync** (updates CSV with new English text)
3. **Update Spanish** in CSV
4. **Generate pages**

### Removing Content

1. **Remove element or ID** from HTML
2. **Run sync** (marks as `deleted` in CSV)
3. **CSV keeps record** for history (can clean up later)
4. **Generate pages** (ignores deleted entries)

## Finding Translations

### By ID (from CSV to HTML)

**CSV shows:**
```csv
page,address,status,id,en,es
about,/about.html,active,story-p1,Text...,Texto...
```

**Find in HTML:**
```bash
# VS Code: Ctrl+Shift+F
# Search: id="story-p1"
# Result: about.html, line 132
```

### By Page (all IDs on a page)

**PowerShell:**
```powershell
Import-Csv i18n/translations.csv | Where-Object {$_.page -eq 'about'} | Select-Object id, status
```

**Or grep:**
```bash
grep "^about," i18n/translations.csv
```

## Benefits

✅ **Automatic Discovery** - Sync script finds all IDs automatically  
✅ **Status Tracking** - Know which translations are active vs deleted  
✅ **Page Organization** - See which page each translation belongs to  
✅ **Address Mapping** - Direct link to where content appears  
✅ **Content Extraction** - Auto-extract current HTML content  
✅ **Clean Workflow** - Edit HTML → Sync → Translate → Generate

## File Structure

```
LenkoStudio/
├── about.html                          # English source
├── contact.html                        # English source
├── index.html                          # English source
├── portfolio.html                      # English source
├── project.html                        # English source
├── es/                                 # Spanish versions (generated)
│   ├── about.html
│   ├── contact.html
│   ├── index.html
│   ├── portfolio.html
│   └── project.html
├── i18n/
│   └── translations.csv               # Central translation database
└── scripts/
    ├── sync_translations.py           # Scan HTML → Update CSV
    └── generate_i18n_all.py           # CSV → Generate Spanish pages
```

## Common Tasks

### See all active translations:
```bash
python scripts/sync_translations.py
```

### See what needs translation:
```bash
# Look for empty Spanish columns
Import-Csv i18n/translations.csv | Where-Object {$_.status -eq 'active' -and $_.es -eq ''}
```

### Clean up deleted entries:
```bash
# Filter CSV to only active entries
Import-Csv i18n/translations.csv | Where-Object {$_.status -eq 'active'} | Export-Csv i18n/translations.csv
```

### Deploy to production:
```bash
# 1. Ensure all translations are complete
# 2. Generate final pages
python scripts/generate_i18n_all.py

# 3. Deploy these files:
#    - All root HTML files (English)
#    - es/ folder (Spanish)
#    - All assets (css/, js/, media/)
```

## Troubleshooting

### Translation not appearing?

1. **Check CSV status:** Is it `active`?
2. **Check ID exists:** Search HTML for `id="your-id"`
3. **Check translation present:** CSV has Spanish text?
4. **Regenerate:** Run `python scripts/generate_i18n_all.py`

### Content outdated in CSV?

1. **Run sync:** `python scripts/sync_translations.py`
2. **Check updated content** in CSV
3. **Update Spanish** if needed
4. **Regenerate pages**

### ID not found by sync script?

1. **Check HTML syntax:** `<element id="your-id">`
2. **Check filename:** Is HTML file in root directory?
3. **Check quotes:** Use double quotes `id="test"` not `id='test'`

## Advanced Tips

### Bulk translation workflow:

1. Run sync to extract all new English content
2. Export CSV to Google Sheets
3. Share with translator
4. Translator fills Spanish column
5. Import back to CSV
6. Generate pages

### Translation memory:

Deleted entries serve as translation memory - if you add back an ID, the sync script will restore the translation.

### Version control:

Commit the CSV file to git - you can see translation history and revert changes if needed.

---

**Last Updated:** January 2026  
**System Version:** 2.0 (CSV-based with auto-sync)
