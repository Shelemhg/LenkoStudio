#!/usr/bin/env python3
"""
Sync translation CSV with actual HTML content.
Scans HTML files, finds elements with IDs, and updates CSV with:
- Page name (HTML filename)
- Status (active if found, deleted if not)
- Address (URL path)
- Current English and Spanish content

Usage:
    python scripts/sync_translations.py
"""

import csv
import re
from pathlib import Path
from typing import Dict, List, Tuple
from html.parser import HTMLParser


class IDExtractor(HTMLParser):
    """HTML parser that extracts elements with ID attributes and their content"""
    
    def __init__(self):
        super().__init__()
        self.elements = {}  # {id: content}
        self.tags = {}  # {id: tag_name}
        self.current_id = None
        self.current_tag = None
        self.capture_content = False
        
    def handle_starttag(self, tag, attrs):
        """Called when opening tag is found"""
        attrs_dict = dict(attrs)
        if 'id' in attrs_dict:
            element_id = attrs_dict['id']
            self.current_id = element_id
            self.current_tag = tag
            self.capture_content = True
            self.elements[element_id] = []
            self.tags[element_id] = tag
    
    def handle_endtag(self, tag):
        """Called when closing tag is found"""
        if self.capture_content and tag == self.current_tag:
            # Join all captured content and clean up whitespace
            content = ''.join(self.elements[self.current_id])
            content = re.sub(r'\s+', ' ', content).strip()
            self.elements[self.current_id] = content
            self.capture_content = False
            self.current_id = None
            self.current_tag = None
    
    def handle_data(self, data):
        """Called when text content is found"""
        if self.capture_content and self.current_id:
            self.elements[self.current_id].append(data)
    
    def handle_startendtag(self, tag, attrs):
        """Called for self-closing tags"""
        attrs_dict = dict(attrs)
        if 'id' in attrs_dict:
            element_id = attrs_dict['id']
            self.elements[element_id] = ''
            self.tags[element_id] = tag


def extract_ids_from_html(html_content: str) -> Dict[str, str]:
    """Extract all elements with IDs and their content from HTML"""
    parser = IDExtractor()
    parser.feed(html_content)
    return parser.elements


def get_page_address(page_name: str, lang: str = 'en') -> str:
    """Generate page address/URL"""
    if lang == 'en':
        return f'/{page_name}.html'
    else:
        return f'/{lang}/{page_name}.html'


def scan_js_translations() -> Dict[str, Dict[str, str]]:
    """
    Scan components.js for JavaScript-based translations.
    Returns: {key: {en: content, es: content}}
    """
    js_file = Path('js/components.js')
    if not js_file.exists():
        return {}
    
    content = js_file.read_text(encoding='utf-8')
    js_translations = {}
    
    # Find translation objects in the JS file
    # Pattern: key: 'value' or key: "value"
    import re
    
    # Find English translations block
    en_match = re.search(r'en:\s*\{([^}]+)\}', content)
    es_match = re.search(r'es:\s*\{([^}]+)\}', content)
    
    if en_match:
        en_block = en_match.group(1)
        # Extract key-value pairs
        for match in re.finditer(r"(\w+):\s*['\"]([^'\"]+)['\"]", en_block):
            key = f"js_{match.group(1)}"  # Prefix with js_ to indicate source
            js_translations[key] = {'en': match.group(2), 'es': ''}
    
    if es_match:
        es_block = es_match.group(1)
        for match in re.finditer(r"(\w+):\s*['\"]([^'\"]+)['\"]", es_block):
            key = f"js_{match.group(1)}"
            if key in js_translations:
                js_translations[key]['es'] = match.group(2)
            else:
                js_translations[key] = {'en': '', 'es': match.group(2)}
    
    return js_translations


def normalize_text_for_search(text: str) -> str:
    """Normalize text for searching - handle encoding issues.
    
    Be careful: only replace encoding artifacts, not legitimate characters.
    The pattern 'word?word' (no space after ?) is likely a corrupted em-dash.
    A '?' followed by space or end of string is likely a real question mark.
    """
    if not text:
        return ''
    import re
    # Replace ? only when it appears between non-space characters (likely corrupted em-dash)
    # Pattern: word?word (no space around ?)
    text = re.sub(r'(\w)\?(\w)', r'\1—\2', text)
    # Also handle: word ?word (space before, not after)
    text = re.sub(r'(\w) \?(\w)', r'\1 —\2', text)
    # Handle UTF-8 misencoded characters
    text = text.replace('â€"', '—')  # UTF-8 em-dash misread as latin-1
    text = text.replace('â€™', "'")  # UTF-8 apostrophe misread
    text = text.replace('Ã¡', 'á')
    text = text.replace('Ã©', 'é')
    text = text.replace('Ã­', 'í')
    text = text.replace('Ã³', 'ó')
    text = text.replace('Ãº', 'ú')
    text = text.replace('Ã±', 'ñ')
    return text.strip()


def find_tag_for_text(content: str, text: str) -> str:
    """
    Try to identify the HTML tag containing the text.
    Returns the tag name or 'text' if not found.
    Returns 'aria' for aria-label attributes (these should be skipped).
    """
    import re
    
    # Check aria-label FIRST - these should be excluded from translations
    aria_pattern = r'aria-label="[^"]*' + re.escape(text) + r'[^"]*"'
    try:
        if re.search(aria_pattern, content, re.IGNORECASE):
            return 'aria'  # Signal to skip this text
    except:
        pass
    
    # Common patterns to search for (excluding aria which was checked above)
    patterns = [
        # Meta description
        (r'<meta[^>]*content="[^"]*' + re.escape(text) + r'[^"]*"', 'meta'),
        # Meta with single quotes
        (r"<meta[^>]*content='[^']*" + re.escape(text) + r"[^']*'", 'meta'),
        # Title tag
        (r'<title[^>]*>[^<]*' + re.escape(text) + r'[^<]*</title>', 'title'),
        # Heading tags
        (r'<h1[^>]*>[^<]*' + re.escape(text) + r'[^<]*</h1>', 'h1'),
        (r'<h2[^>]*>[^<]*' + re.escape(text) + r'[^<]*</h2>', 'h2'),
        (r'<h3[^>]*>[^<]*' + re.escape(text) + r'[^<]*</h3>', 'h3'),
        # Paragraph
        (r'<p[^>]*>[^<]*' + re.escape(text) + r'[^<]*</p>', 'p'),
        # Link
        (r'<a[^>]*>[^<]*' + re.escape(text) + r'[^<]*</a>', 'a'),
        # Button
        (r'<button[^>]*>[^<]*' + re.escape(text) + r'[^<]*</button>', 'button'),
        # Span
        (r'<span[^>]*>[^<]*' + re.escape(text) + r'[^<]*</span>', 'span'),
        # List item
        (r'<li[^>]*>[^<]*' + re.escape(text) + r'[^<]*</li>', 'li'),
    ]
    
    for pattern, tag in patterns:
        try:
            if re.search(pattern, content, re.IGNORECASE | re.DOTALL):
                return tag
        except:
            pass
    
    return 'text'


def text_exists_in_project(text: str) -> Tuple[bool, str, str]:
    """
    Check if text exists somewhere in the project.
    Returns: (exists, location, source_type/tag)
    """
    if not text or len(text.strip()) < 2:
        return False, '', ''
    
    original_text = text.strip()
    
    # If text is short, don't search (too many false positives)
    if len(original_text) < 3:
        return False, '', ''
    
    # Create search variants:
    # 1. Original text
    # 2. Normalized text (fixing encoding issues)
    # 3. Text with ? replaced by em-dash (common corruption)
    search_variants = [original_text]
    
    normalized = normalize_text_for_search(original_text)
    if normalized != original_text:
        search_variants.append(normalized)
    
    # Also try replacing all ? with em-dash as fallback
    with_emdash = original_text.replace('?', '—').replace(' — ', ' — ')
    if with_emdash not in search_variants:
        search_variants.append(with_emdash)
    
    # Search in HTML files
    html_files = list(Path('.').glob('*.html')) + list(Path('es').glob('*.html'))
    for html_file in html_files:
        try:
            content = html_file.read_text(encoding='utf-8')
            for variant in search_variants:
                if variant in content:
                    # Try to identify the tag containing this text
                    tag = find_tag_for_text(content, variant)
                    return True, str(html_file), tag
        except:
            pass
    
    # Search in JS files (including root directory)
    js_files = list(Path('js').glob('*.js')) + list(Path('.').glob('*.js'))
    for js_file in js_files:
        try:
            content = js_file.read_text(encoding='utf-8')
            for variant in search_variants:
                if variant in content:
                    return True, str(js_file), 'js'
        except:
            pass
    
    return False, '', ''


def scan_html_files() -> Tuple[Dict[str, Dict[str, Dict[str, str]]], Dict[str, Dict[str, str]]]:
    """
    Scan all HTML files and extract ID-based content.
    Returns: (page_ids, tag_info)
        page_ids: {page_name: {id: {en: content, es: content}}}
        tag_info: {page_name: {id: tag_name}}
    """
    pages = ['index', 'about', 'contact', 'portfolio', 'project']
    page_ids = {}
    tag_info = {}
    
    for page in pages:
        page_ids[page] = {}
        tag_info[page] = {}
        
        # Scan English version
        en_file = Path(f'{page}.html')
        if en_file.exists():
            extractor = IDExtractor()
            extractor.feed(en_file.read_text(encoding='utf-8'))
            
            for element_id, content in extractor.elements.items():
                if element_id not in page_ids[page]:
                    page_ids[page][element_id] = {}
                page_ids[page][element_id]['en'] = content
                tag_info[page][element_id] = extractor.tags.get(element_id, 'unknown')
        
        # Scan Spanish version
        es_file = Path(f'es/{page}.html')
        if es_file.exists():
            extractor = IDExtractor()
            extractor.feed(es_file.read_text(encoding='utf-8'))
            
            for element_id, content in extractor.elements.items():
                if element_id not in page_ids[page]:
                    page_ids[page][element_id] = {}
                page_ids[page][element_id]['es'] = content
                # Tag info from English is preferred, but record Spanish if not set
                if element_id not in tag_info[page]:
                    tag_info[page][element_id] = extractor.tags.get(element_id, 'unknown')
    
    return page_ids, tag_info


def guess_page_from_id(element_id: str, en_content: str = '') -> str:
    """
    Intelligently guess which page an ID belongs to based on naming patterns
    """
    element_id_lower = element_id.lower()
    en_content_lower = en_content.lower()
    
    # Check ID prefixes and patterns
    if element_id_lower.startswith('about') or 'about' in element_id_lower:
        return 'about'
    elif element_id_lower.startswith('contact') or 'contact' in element_id_lower:
        return 'contact'
    elif element_id_lower.startswith('portfolio') or 'portfolio' in element_id_lower:
        return 'portfolio'
    elif element_id_lower.startswith('project') or 'project' in element_id_lower:
        return 'project'
    elif element_id_lower.startswith(('home', 'index')) or 'home' in element_id_lower:
        return 'index'
    
    # Check content patterns
    if 'about' in en_content_lower[:50]:  # Check first 50 chars
        return 'about'
    elif 'contact' in en_content_lower[:50]:
        return 'contact'
    elif 'portfolio' in en_content_lower[:50]:
        return 'portfolio'
    
    # Navigation and common elements - could be on any page, default to index
    if element_id_lower.startswith(('nav_', 'site_', 'footer_', 'skip_', 'aria_')):
        return 'index'  # These appear on all pages, but index is a reasonable default
    
    # Generic action buttons/links - index page
    if element_id_lower in ('book_a_shoot', 'learn_more', 'read_more', 'back', 'next', 'previous'):
        return 'index'
    
    # Sound controls - likely on project page with video
    if 'sound' in element_id_lower:
        return 'project'
    
    # Story/approach/offer patterns suggest about page
    if any(pattern in element_id_lower for pattern in ['story', 'approach', 'offer', 'values']):
        return 'about'
    
    # Email/phone/WhatsApp patterns suggest contact page
    if any(pattern in element_id_lower for pattern in ['email', 'phone', 'whatsapp', 'message']):
        return 'contact'
    
    return 'unknown'


def load_existing_csv() -> Dict[str, Dict[str, str]]:
    """Load existing CSV translations"""
    csv_file = Path('i18n/translations.csv')
    existing = {}
    
    if not csv_file.exists():
        return existing
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            element_id = row.get('id', '')
            if element_id:
                existing[element_id] = row
    
    return existing


def create_updated_csv(page_ids: Dict[str, Dict[str, Dict[str, str]]],
                       tag_info: Dict[str, Dict[str, str]],
                       existing_data: Dict[str, Dict[str, str]]) -> List[Dict[str, str]]:
    """
    Create updated CSV data combining scanned HTML and existing translations.
    Priority: Use scanned content if available, fallback to existing CSV
    """
    rows = []
    processed_ids = set()
    
    # Process all scanned IDs (active elements)
    for page, ids_data in page_ids.items():
        for element_id, content_data in ids_data.items():
            if element_id in processed_ids:
                continue
            
            processed_ids.add(element_id)
            
            # Get content from scanned files
            en_content = content_data.get('en', '')
            es_content_from_html = content_data.get('es', '')
            
            # Convert to string if it's a list (from HTML parser)
            if isinstance(en_content, list):
                en_content = ' '.join(str(item) for item in en_content if item)
            if isinstance(es_content_from_html, list):
                es_content_from_html = ' '.join(str(item) for item in es_content_from_html if item)
            
            # Skip elements with no meaningful content (empty or just whitespace)
            # These are usually structural containers (divs, videos, main) not translatable text
            # IMPORTANT: Skip even if it exists in CSV - we want to remove empty entries
            if not en_content or not en_content.strip():
                continue
            
            # Priority for Spanish: existing CSV > scanned Spanish HTML
            # (Spanish HTML is generated and might not be up to date)
            if element_id in existing_data and existing_data[element_id].get('es', ''):
                es_content = existing_data[element_id].get('es', '')
            else:
                es_content = es_content_from_html
            
            # Get tag type for this element
            tag_type = tag_info.get(page, {}).get(element_id, 'unknown')
            
            # Determine page from ID pattern or existing data
            if element_id in existing_data and existing_data[element_id].get('page'):
                best_page = existing_data[element_id]['page']
            else:
                best_page = page
            
            address = get_page_address(best_page)
            
            rows.append({
                'page': best_page,
                'address': address,
                'status': 'active',
                'tag': tag_type,
                'id': element_id,
                'en': en_content,
                'es': es_content
            })
    
    # That's it! We only keep entries that have actual HTML element IDs.
    # No more legacy text-based searches - if there's no ID in the HTML, it shouldn't be in the CSV.
    
    return rows


def write_csv(rows: List[Dict[str, str]], output_file: Path):
    """Write updated CSV file, removing duplicates by preferring hyphenated IDs"""
    # First, deduplicate based on English text
    # Prefer kebab-case (hyphenated) IDs over camelCase or snake_case (legacy)
    seen_text = {}
    deduplicated_rows = []
    
    def id_score(element_id: str) -> int:
        """Score an ID - higher is better. Prefer kebab-case."""
        score = 0
        # Penalize underscore (snake_case - old style)
        if '_' in element_id:
            score -= 1000
        # Reward hyphens (kebab-case - modern style)
        if '-' in element_id:
            score += 100
        # Penalize camelCase (no separators)
        if not ('-' in element_id or '_' in element_id):
            score -= 50
        # Prefer shorter IDs (more specific)
        score -= len(element_id)
        return score
    
    for row in rows:
        en_text = row['en']
        element_id = row['id']
        
        if en_text in seen_text:
            # Already have this text - decide which ID to keep
            existing_id = seen_text[en_text]['id']
            current_score = id_score(element_id)
            existing_score = id_score(existing_id)
            
            if current_score > existing_score:
                # Current ID is better - replace existing
                deduplicated_rows = [r for r in deduplicated_rows if r['id'] != existing_id]
                deduplicated_rows.append(row)
                seen_text[en_text] = row
            # else: keep existing, skip current
        else:
            # First time seeing this text
            deduplicated_rows.append(row)
            seen_text[en_text] = row
    
    fieldnames = ['page', 'address', 'status', 'tag', 'id', 'en', 'es']
    
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(deduplicated_rows)


def main():
    """Main function to sync translations"""
    print("🔄 Syncing translation CSV with HTML files...\n")
    
    # Scan all HTML files
    print("📄 Scanning HTML files...")
    page_ids, tag_info = scan_html_files()
    
    # Count total IDs found
    total_ids = sum(len(ids) for ids in page_ids.values())
    print(f"   ✓ Found {total_ids} elements with IDs across all pages\n")
    
    # Load existing CSV
    print("📊 Loading existing CSV...")
    existing_data = load_existing_csv()
    print(f"   ✓ Loaded {len(existing_data)} existing entries\n")
    
    # Create updated CSV data
    print("🔄 Merging data...")
    updated_rows = create_updated_csv(page_ids, tag_info, existing_data)
    
    # Count active vs deleted
    active_rows = [row for row in updated_rows if row['status'] == 'active']
    deleted_rows = [row for row in updated_rows if row['status'] == 'deleted']
    active_count = len(active_rows)
    deleted_count = len(deleted_rows)
    print(f"   ✓ {active_count} active translations")
    print(f"   ✓ {deleted_count} obsolete entries to remove\n")
    
    # Show what's being deleted
    if deleted_rows:
        print("🗑️  Removing obsolete entries (text no longer exists in project):")
        for row in deleted_rows:
            en_preview = row['en'][:40] + '...' if len(row['en']) > 40 else row['en']
            print(f"   - {row['id']}: {en_preview}")
        print()
    
    # Remove deleted entries - only keep active ones
    final_rows = active_rows
    
    # Write updated CSV (only active entries)
    output_file = Path('i18n/translations.csv')
    print(f"💾 Writing cleaned CSV...")
    write_csv(final_rows, output_file)
    print(f"   ✓ Saved {len(final_rows)} active entries to {output_file}\n")
    
    # Show summary by page
    print("📋 Summary by page:")
    for page_name in sorted(set(row['page'] for row in final_rows)):
        page_rows = [r for r in final_rows if r['page'] == page_name]
        print(f"   {page_name:12} → {len(page_rows)} active IDs")
    
    print(f"\n✨ Done! CSV cleaned - {deleted_count} obsolete entries removed")
    print("\nNext steps:")
    print("1. Review i18n/translations.csv")
    print("2. Add Spanish translations for any missing entries")
    print("3. Run: python scripts/generate_i18n_all.py")


if __name__ == "__main__":
    main()
