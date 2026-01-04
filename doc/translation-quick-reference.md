# Quick Reference: ID-Based Translation System

## At a Glance

The translation system uses **HTML element IDs** to connect translations in the CSV file to specific elements on your pages. The CSV automatically tracks which page each ID belongs to and whether it's still in use.

## CSV Structure

```csv
page,address,status,id,en,es
about,/about.html,active,story-p1,English content,Spanish content
contact,/contact.html,deleted,old-id,Old content,Contenido antiguo
```

**Columns:**
- `page` - Which HTML file (about, contact, index, etc.)
- `address` - URL path (/about.html, /contact.html)
- `status` - `active` (in HTML) or `deleted` (removed from HTML)
- `id` - Element ID attribute
- `en` - English content
- `es` - Spanish content

## Quick Workflow

### Standard Workflow
```
1. Edit HTML (add/remove IDs) 
   ↓
2. Run sync script (updates CSV automatically)
   ↓
3. Add missing translations in CSV
   ↓
4. Generate pages (creates Spanish versions)
```

### Finding Translations
```
CSV shows: page=about, id=story-p1
         ↓
Search: about.html for id="story-p1"
         ↓
Found exact location!
```

## Commands

**Sync CSV with HTML files:**
```bash
python scripts/sync_translations.py
```

**Generate translated pages:**
```bash
python scripts/generate_i18n_all.py
```

**Find where an ID is used:**
```bash
# PowerShell
Select-String -Pattern 'id="story-p1"' -Path *.html

# Or in VS Code: Ctrl+Shift+F, search: id="story-p1"
```

## Example

**CSV Entry:**
```csv
id,en,es
approach-calm,<strong>Calm direction:</strong> Relaxed sessions...,<strong>Dirección tranquila:</strong> Sesiones relajadas...
```

**HTML Location:**
```html
<!-- about.html, line ~143 -->
<li id="approach-calm">
    <strong>Calm direction:</strong> Relaxed sessions that keep you present and comfortable.
</li>
```

**Search Command:**
```bash
# Find in any HTML file
grep -r 'id="approach-calm"' *.html
```

**VS Code:**
- Press `Ctrl+Shift+F` (Windows) or `Cmd+Shift+F` (Mac)
- Search: `id="approach-calm"`
- See exact file and line number

## Adding a New Translation

### Step 1: Add ID to HTML
```html
<p id="my-new-text">This is some new content.</p>
```

### Step 2: Add to CSV
```csv
id,en,es
my-new-text,This is some new content.,Este es un contenido nuevo.
```

### Step 3: Generate
```bash
python scripts/generate_i18n_all.py
```

### Step 4: Verify
```bash
# Check it worked
grep 'id="my-new-text"' es/about.html
```

## Common ID Patterns

| Pattern | Example | Used For |
|---------|---------|----------|
| `page-title` | `about-page-title` | Main page heading |
| `section-p1` | `story-p1` | First paragraph in section |
| `category-item` | `approach-calm` | List items grouped by category |
| `element-desc` | `email-desc` | Descriptions or help text |
| `action-type` | `contact-intro` | Action-oriented content |

## ID Naming Best Practices

✅ **Do:**
- Use lowercase: `story-p1` not `Story-P1`
- Use hyphens: `contact-intro` not `contact_intro`
- Be descriptive: `approach-calm` not `item1`
- Group related: `offer-weddings`, `offer-portraits`, `offer-projects`

❌ **Don't:**
- Use spaces: `story p1` ❌
- Use special chars: `story@p1` ❌
- Be vague: `text1`, `content2` ❌
- Mix conventions: `storyP1` ❌

## Troubleshooting

### Translation Not Working?

**Check 1: Does HTML have the ID?**
```bash
grep 'id="story-p1"' about.html
```

**Check 2: Does CSV have the ID?**
```bash
grep 'story-p1' i18n/translations.csv
```

**Check 3: Do they match exactly?**
- CSV: `story-p1`
- HTML: `id="story-p1"` ✅
- HTML: `id="story_p1"` ❌ (underscore vs hyphen)

### Can't Find Where Translation Is Used?

**Use grep to search all files:**
```bash
grep -r 'id="approach-calm"' .
```

**Or in PowerShell:**
```powershell
Select-String -Pattern 'id="approach-calm"' -Path *.html -Recurse
```

**Or in VS Code:**
1. Press `Ctrl+Shift+F`
2. Type: `id="approach-calm"`
3. Press Enter
4. See all matches with file names and line numbers

## Current Element IDs

### About Page
```
about-page-title      → <h1>About Us</h1>
story-p1              → <p>Lenko Studio, a distinct style...</p>
story-p2              → <p>Lenko Studio Weddings...</p>
approach-calm         → <li>Calm direction: Relaxed sessions...</li>
approach-color        → <li>Editorial color: Rich, cinematic tones...</li>
approach-story        → <li>Story first: Honest storytelling...</li>
approach-collab       → <li>Close collaboration: We plan with you...</li>
approach-global       → <li>Mexico City roots, global reach...</li>
offer-weddings        → <li>Weddings: From proposals...</li>
offer-portraits       → <li>Portraits: Editorial portraits...</li>
offer-projects        → <li>Projects: Brand films...</li>
```

### Contact Page
```
contact-page-title    → <h1>Contact</h1>
contact-intro         → <p>Ready to book, ask a question...</p>
email-desc            → <p>Best for detailed requests...</p>
whatsapp-desc         → <p>Best for quick questions...</p>
contact-type          → <li>Type of shoot (portraits...</li>
contact-date          → <li>Preferred date(s) and location</li>
contact-refs          → <li>Any moodboard / references...</li>
contact-use           → <li>How you want to use the photos...</li>
contact-reply         → <p>We reply as soon as possible...</p>
```

## Tips

💡 **Use consistent IDs across pages**  
If multiple pages have an intro paragraph, use `page-intro` pattern:
- `about-intro`
- `contact-intro`
- `portfolio-intro`

💡 **Keep a list of your IDs**  
Consider maintaining this quick reference document as you add more translations.

💡 **Test after adding IDs**  
Always regenerate and verify translations work after adding new IDs.

💡 **Use browser dev tools**  
Right-click any translated element → Inspect → See the ID attribute

---

**Need Help?** Search for any ID in:
1. Your HTML files (`about.html`, `contact.html`, etc.)
2. The CSV file (`i18n/translations.csv`)
3. Generated Spanish files (`es/about.html`, `es/contact.html`)
