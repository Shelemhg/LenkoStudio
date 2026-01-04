#!/usr/bin/env python3
"""
Generate multilingual HTML pages by copying existing pages and updating language-specific elements.
Run this script whenever you update translations or need to regenerate language versions.

Usage:
    python scripts/generate_i18n_all.py
"""

import json
import re
import csv
from pathlib import Path
from typing import Dict, Any


def load_translations_csv() -> Dict[str, Dict[str, str]]:
    """Load translations from CSV file and return dict with structure: {lang: {id: translation}}"""
    csv_file = Path("i18n/translations.csv")
    
    if not csv_file.exists():
        raise FileNotFoundError(f"Translation CSV not found: {csv_file}")
    
    translations = {'en': {}, 'es': {}}
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Skip deleted entries
            status = row.get('status', 'active')
            if status == 'deleted':
                continue
                
            element_id = row['id']
            translations['en'][element_id] = row['en']
            translations['es'][element_id] = row['es']
    
    return translations


def load_translations(lang: str) -> Dict[str, Any]:
    """Load translation JSON file for specified language (legacy fallback)"""
    i18n_dir = Path("i18n")
    json_file = i18n_dir / f"{lang}.json"
    
    if not json_file.exists():
        raise FileNotFoundError(f"Translation file not found: {json_file}")
    
    with open(json_file, 'r', encoding='utf-8') as f:
        return json.load(f)


def translate_html_attributes(html: str, lang: str, t: Dict[str, Any], page_name: str) -> str:
    """Update language-specific HTML attributes and meta tags"""
    
    # Update lang attribute
    html = re.sub(r'<html lang="en">', f'<html lang="{lang}">', html)
    
    # Update page title based on page
    title_map = {
        'index': t['site']['title'],
        'about': t['about']['title'],
        'contact': t['contact']['title'],
        'portfolio': t['portfolio']['title'],
        'project': f"{t['site']['title']} — {t['meta']['project_title']}"
    }
    title = title_map.get(page_name, t['site']['title'])
    html = re.sub(r'<title>.*?</title>', f'<title>{title}</title>', html, flags=re.DOTALL)
    
    # Update meta description
    desc_map = {
        'index': t['meta']['description'],
        'about': t['meta']['about_description'],
        'contact': t['meta']['contact_description'],
        'portfolio': t['meta']['portfolio_description'],
        'project': t['meta']['description']
    }
    description = desc_map.get(page_name, t['meta']['description'])
    html = re.sub(
        r'<meta\s+name="description"\s+content="[^"]*"',
        f'<meta name="description" content="{description}"',
        html
    )
    
    return html


def add_hreflang_tags(html: str, page_name: str, is_default: bool) -> str:
    """Add hreflang tags for SEO"""
    
    # Define paths for both languages
    en_href = f"{page_name}.html"
    es_href = f"es/{page_name}.html"
    
    hreflang_tags = f'''
    <!-- Alternate language versions for SEO -->
    <link rel="alternate" hreflang="en" href="{en_href}" />
    <link rel="alternate" hreflang="es" href="{es_href}" />
    <link rel="alternate" hreflang="x-default" href="{en_href}" />
'''
    
    # Remove any existing hreflang tags first to avoid duplicates
    html = re.sub(
        r'<!--\s*Alternate language versions.*?-->\s*<link rel="alternate"[^>]*>\s*<link rel="alternate"[^>]*>\s*<link rel="alternate"[^>]*>',
        '',
        html,
        flags=re.DOTALL
    )
    
    # Insert after viewport meta tag
    html = re.sub(
        r'(<meta\s+name="viewport"[^>]*>)',
        r'\1' + hreflang_tags,
        html
    )
    
    return html


def update_asset_paths(html: str, is_default: bool) -> str:
    """Update relative paths for assets when in subdirectory"""
    if is_default:
        return html
    
    # Add ../ prefix to asset paths (including those with query parameters)
    # CSS files
    html = re.sub(r'href="(style\.css[^"]*|css/[^"]*)"', r'href="../\1"', html)
    
    # JavaScript files
    html = re.sub(r'src="(js/[^"]+|app\.js[^"]*)"', r'src="../\1"', html)
    
    # Media files (logo, images, audio, video)
    html = re.sub(r'(href|src)="(media/[^"]+)"', r'\1="../\2"', html)
    
    # Data files
    html = re.sub(r'src="(data/[^"]+)"', r'src="../\1"', html)
    
    # Navigation links STAY in Spanish - don't add ../
    # The component handles navigation with lang attribute
    # Just leave them as-is: portfolio.html, about.html, etc.
    
    return html


def update_component_lang_attributes(html: str, lang: str, page_name: str) -> str:
    """Update lang attributes on web components"""
    
    # Update site-header
    html = re.sub(
        r'(<site-header[^>]*)',
        lambda m: f'{m.group(1)} lang="{lang}"' if 'lang=' not in m.group(1) else re.sub(r'lang="[^"]*"', f'lang="{lang}"', m.group(1)),
        html
    )
    
    # Update site-footer
    html = re.sub(
        r'(<site-footer[^>]*)',
        lambda m: f'{m.group(1)} lang="{lang}"' if 'lang=' not in m.group(1) else re.sub(r'lang="[^"]*"', f'lang="{lang}"', m.group(1)),
        html
    )
    
    return html


def translate_content(html: str, lang: str, csv_translations: Dict[str, Dict[str, str]]) -> str:
    """Translate page content from English to Spanish using CSV translations with element IDs"""
    
    if lang == 'en':
        return html
    
    # Get translations for the target language
    translations = csv_translations.get(lang, {})
    
    # Process each translation ID
    for element_id, target_text in translations.items():
        # Skip if there's no English version or texts are the same
        en_text = csv_translations['en'].get(element_id)
        if not en_text or en_text == target_text:
            continue
        
        # Strategy 1: Replace by element ID (preferred method)
        # Pattern: id="element-id">content</tag>
        # This is the most precise method - directly targets elements with IDs
        id_pattern = f'id="{re.escape(element_id)}"([^>]*)>\\s*{re.escape(en_text)}\\s*<'
        if re.search(id_pattern, html, flags=re.DOTALL):
            html = re.sub(
                id_pattern,
                f'id="{element_id}"\\1>{target_text}<',
                html,
                flags=re.DOTALL
            )
            continue
        
        # Strategy 2: Fallback to text matching for elements without IDs (legacy keys)
        # This handles old-style keys that don't match HTML element IDs
        # Replace exact matches while preserving HTML structure
        html = re.sub(
            f'(>)\\s*{re.escape(en_text)}\\s*(<)',
            f'\\1{target_text}\\2',
            html,
            flags=re.DOTALL
        )
        
        # Also replace in attribute values like placeholder, title, etc.
        html = re.sub(
            f'(placeholder|title|aria-label)="\\s*{re.escape(en_text)}\\s*"',
            f'\\1="{target_text}"',
            html,
            flags=re.IGNORECASE
        )
    
    return html


def generate_page(page_name: str, lang: str, translations: Dict[str, Any], csv_translations: Dict[str, Dict[str, str]], is_default: bool = False):
    """Generate a page in the specified language"""
    
    # Read the English source file
    source_file = Path(f"{page_name}.html")
    if not source_file.exists():
        print(f"   ⚠ Skipping {page_name}.html - file not found")
        return None
    
    with open(source_file, 'r', encoding='utf-8') as f:
        html = f.read()
    
    # Apply transformations
    html = translate_html_attributes(html, lang, translations, page_name)
    html = add_hreflang_tags(html, page_name, is_default)
    html = update_asset_paths(html, is_default)
    html = update_component_lang_attributes(html, lang, page_name)
    html = translate_content(html, lang, csv_translations)
    
    return html


def main():
    """Generate all language versions of all pages"""
    
    print("🌍 Generating multilingual pages...\n")
    
    # Load CSV translations
    print("📊 Loading CSV translations...")
    csv_translations = load_translations_csv()
    print(f"   ✓ Loaded {len(csv_translations['en'])} translation keys\n")
    
    # Pages to translate
    pages = ["index", "about", "contact", "portfolio", "project"]
    
    # Supported languages
    languages = ["en", "es"]
    default_lang = "en"
    
    # Generate each page for each language
    for lang in languages:
        print(f"📄 Processing {lang.upper()}...")
        
        # Load JSON translations (for metadata)
        translations = load_translations(lang)
        
        # Determine if this is the default language
        is_default = (lang == default_lang)
        
        # Create output directory for non-default languages
        if not is_default:
            output_dir = Path(lang)
            output_dir.mkdir(exist_ok=True)
        
        # Generate each page
        for page_name in pages:
            html = generate_page(page_name, lang, translations, csv_translations, is_default)
            
            if html is None:
                continue
            
            # Determine output path
            if is_default:
                output_file = Path(f"{page_name}.html")
            else:
                output_file = Path(lang) / f"{page_name}.html"
            
            # Write file
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(html)
            
            print(f"   ✓ Generated: {output_file}")
    
    print(f"\n✨ Done! Generated {len(languages)} language versions of {len(pages)} pages")
    print("\nNext steps:")
    print("1. Test all pages in both languages")
    print("2. Verify language switcher works correctly")
    print("3. Check all asset paths load properly")


if __name__ == "__main__":
    main()
