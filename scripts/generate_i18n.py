#!/usr/bin/env python3
"""
Generate multilingual HTML pages from templates and translation files.
Run this script whenever you update translations or page content.

This is the legacy script for project.html template-based generation.
For all other pages, use generate_i18n_all.py instead.

Usage:
    python scripts/generate_i18n.py          # Generate project.html only
    python scripts/generate_i18n_all.py      # Generate all pages
"""

import json
from pathlib import Path
from typing import Dict, Any


def load_translations(lang: str) -> Dict[str, Any]:
    """Load translation JSON file for specified language"""
    i18n_dir = Path("i18n")
    json_file = i18n_dir / f"{lang}.json"
    
    if not json_file.exists():
        raise FileNotFoundError(f"Translation file not found: {json_file}")
    
    with open(json_file, 'r', encoding='utf-8') as f:
        return json.load(f)


def generate_project_page(lang: str, translations: Dict[str, Any], is_default: bool = False):
    """Generate project.html for specified language"""
    
    # Language-specific values
    lang_code = lang
    t = translations
    
    # Alternate language for hreflang
    alt_lang = "es" if lang == "en" else "en"
    alt_file = "es/project.html" if lang == "en" else "project.html"
    current_file = "project.html" if is_default else f"{lang}/project.html"
    
    # Path prefix for assets (only needed in Spanish subdirectory)
    asset_prefix = "../" if not is_default else ""
    
    # Generate HTML content
    html = f'''<!--
╔═════════════════════════════════════════════════════════════════════════════╗
║                          LENKO STUDIO - PROJECT PAGE                        ║
║                     Cinematic Intro with Video Background                   ║
╚═════════════════════════════════════════════════════════════════════════════╝

PURPOSE:
    This page serves as a cinematic landing experience with a full-screen video
    background and stage-based reveal system.

LANGUAGE: {lang_code.upper()}

AUTHOR: Lenko Studio
LAST MODIFIED: 2026-01-03
-->

<!doctype html>
<html lang="{lang_code}">


<!-- ========================================================================= -->
<!-- HEAD: Meta, Fonts, Stylesheets, SEO                                       -->
<!-- ========================================================================= -->

<head>
    <!-- Character encoding and viewport for responsive design -->
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    
    <!-- Site favicon -->
    <link rel="icon" type="image/png" href="{asset_prefix}media/Logo.png" />

    <!-- Page title shown in browser tab -->
    <title>{t['site']['title']} — {t['meta']['project_title']}</title>


    <!-- ===== SEO & i18n ===== -->
    
    <!-- Meta description for search engines -->
    <meta name="description" content="{t['meta']['description']}" />
    
    <!-- Alternate language versions for SEO -->
    <link rel="alternate" hreflang="{lang_code}" href="{current_file}" />
    <link rel="alternate" hreflang="{alt_lang}" href="{alt_file}" />
    <link rel="alternate" hreflang="x-default" href="project.html" />


    <!-- ===== FONTS ===== -->
    
    <!-- Google Fonts: Inter (body text) + Playfair Display (headings) -->
    <!-- Preconnect for faster font loading -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap"
        rel="stylesheet"
    />


    <!-- ===== STYLESHEETS ===== -->
    
    <!-- Main stylesheet with cache-busting version parameter -->
    <link rel="stylesheet" href="{asset_prefix}style.css?v=20251230a" />


    <!-- ===== SCRIPTS ===== -->
    
    <!-- Web components (header/footer) - load early but defer execution -->
    <script src="{asset_prefix}js/components.js?v=20251230a" defer></script>
</head>


<!-- ========================================================================= -->
<!-- BODY: Main Content and Layout                                             -->
<!-- ========================================================================= -->

<!-- Initial class "stage-0" for page initialization -->
<body class="stage-0">


    <!-- ===== ACCESSIBILITY ===== -->
    
    <!-- 
        Skip link for keyboard users and screen readers.
        Allows quick navigation to main content.
    -->
    <a id="skipIntro" class="skip-link" href="#main">{t['accessibility']['skip_link']}</a>


    <!-- ===== SITE HEADER ===== -->
    
    <!-- 
        Custom web component (defined in components.js).
        Renders navigation bar with logo and menu links.
        "current" attribute highlights the active page.
    -->
    <site-header current="project" lang="{lang_code}"></site-header>


    <!-- ========================================================================= -->
    <!-- MAIN CONTENT: Hero Section with Video Background                         -->
    <!-- ========================================================================= -->

    <main id="main" class="home" role="main">

        <!-- ===== HERO SECTION ===== -->
        
        <!-- 
            Full-viewport cinematic hero section.
            Contains layered elements: video, scrim, grid, content.
        -->
        <section class="hero" aria-label="Cinematic Intro">

            <!-- ----- VIDEO BACKGROUND ----- -->
            
            <!-- 
                Video wrap container for responsive video sizing.
                Hidden from screen readers (decorative only).
            -->
            <div class="video-wrap" aria-hidden="true">
                <!-- 
                    Background video element.
                    - muted: Required for autoplay in most browsers
                    - playsinline: Prevents fullscreen on iOS
                    - loop: Continuous playback
                    - preload="none": Lazy loading (home.js loads video after page ready)
                    - No src: Added dynamically by home.js for performance
                -->
                <video id="bgVideo" muted playsinline loop preload="none"></video>
                
                <!-- 
                    Scrim (dark overlay) for text readability.
                    Creates semi-transparent gradient over video.
                -->
                <div class="scrim"></div>
            </div>


            <!-- ----- GRID OVERLAY ----- -->
            
            <!-- 
                Animated grid pattern for visual depth and sophistication.
                Hidden from screen readers (decorative).
            -->
            <div id="gridOverlay" class="grid-overlay" aria-hidden="true"></div>


            <!-- ----- HERO CONTENT ----- -->
            
            <!-- 
                Main content container with title and CTAs.
                Stacks above video/grid using z-index.
            -->
            <div class="hero-content">
                
                <!-- 
                    Main title with animation.
                    - tabindex="0": Makes focusable for accessibility
                -->
                <h1 id="introTitle" class="intro-title" tabindex="0">{t['project']['title']}</h1>

                <!-- 
                    Call-to-action buttons container.
                    - aria-live="polite": Announces changes to screen readers
                -->
                <div id="heroCtas" class="hero-ctas" aria-live="polite">
                    <!-- Primary CTA: Navigate to portfolio -->
                    <a class="cta" href="{asset_prefix}portfolio.html" id="ctaExplore">{t['project']['cta_explore']}</a>
                </div>

            </div>

        </section>


        <!-- ===== FLOATING CTA ===== -->
        
        <!-- 
            Persistent call-to-action button fixed to viewport.
            Remains visible during scroll for conversion opportunities.
            Links to booking/contact page.
        -->
        <a class="floating-cta" href="{asset_prefix}contact.html">{t['project']['cta_book']}</a>

    </main>


    <!-- ========================================================================= -->
    <!-- SITE FOOTER                                                               -->
    <!-- ========================================================================= -->

    <!-- 
        Custom web component (defined in components.js).
        Renders footer with links, social media, and copyright.
    -->
    <site-footer lang="{lang_code}"></site-footer>


    <!-- ========================================================================= -->
    <!-- SCRIPTS: Page Behavior and Interactions                                  -->
    <!-- ========================================================================= -->

    <!-- 
        home.js: Page-specific functionality
        - Intro sequence orchestration (stage transitions)
        - Video lazy loading and playback
        - Grid overlay animations
    -->
    <script src="{asset_prefix}js/home.js?v=20251230a" defer></script>

    <!-- 
        app.js: Global site functionality
        - PJAX (smooth page transitions without full reload)
        - Audio management
        - Form handling and validation
    -->
    <script src="{asset_prefix}app.js?v=20251230a" defer></script>
    
    <!-- Analytics and user tracking -->
    <script src="{asset_prefix}js/analytics.js?v=20260103" defer></script>


</body>
</html>
'''
    
    return html


def main():
    """Generate all language versions of pages"""
    
    print("🌍 Generating multilingual pages...\n")
    
    # Supported languages
    languages = ["en", "es"]
    default_lang = "en"
    
    # Generate project.html for each language
    for lang in languages:
        print(f"📄 Processing {lang.upper()}...")
        
        # Load translations
        translations = load_translations(lang)
        
        # Generate HTML
        is_default = (lang == default_lang)
        html = generate_project_page(lang, translations, is_default)
        
        # Determine output path
        if is_default:
            output_file = Path("project.html")
        else:
            output_dir = Path(lang)
            output_dir.mkdir(exist_ok=True)
            output_file = output_dir / "project.html"
        
        # Write file
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html)
        
        print(f"   ✓ Generated: {output_file}")
    
    print(f"\n✨ Done! Generated {len(languages)} language versions")
    print("\nNext steps:")
    print("1. Review the generated files")
    print("2. Add language switcher to components.js")
    print("3. Test both language versions")


if __name__ == "__main__":
    main()
