#!/usr/bin/env python3
"""
Generate home gallery HTML with all images hardcoded.
Run this script whenever you add/remove images from media/home/
"""

import os
import random
from pathlib import Path

def generate_gallery_html():
    """Generate gallery HTML with all images distributed across columns"""
    
    # Get all images from media/home/
    media_dir = Path("media/home")
    if not media_dir.exists():
        print(f"Error: {media_dir} does not exist")
        return
    
    # Get all jpg files
    images = sorted([f for f in os.listdir(media_dir) if f.endswith(('.jpg', '.jpeg', '.png'))])
    
    if not images:
        print("No images found in media/home/")
        return
    
    print(f"Found {len(images)} images")
    
    # Randomize order for variety (you can remove this line for alphabetical order)
    random.shuffle(images)
    
    # Distribute across 3 columns for desktop (CSS adjusts to 2 on mobile)
    columns = [[], [], []]
    for idx, img in enumerate(images):
        columns[idx % 3].append(img)
    
    # Generate HTML with column divs
    html = """            <!-- Gallery Container -->
            <!-- This wrapper holds the multi-column masonry layout -->
            <div class="home-gallery__wrap">
                <!-- Gallery columns for true masonry - each item has its own height -->
                <div id="homeGallery" class="home-gallery__columns" aria-label="Gallery">
"""
    
    # Generate columns with images
    for col_idx, column_images in enumerate(columns):
        html += f'\n                    <!-- Column {col_idx + 1} -->\n'
        html += '                    <div class="home-gallery__column">\n'
        
        for img_idx, img_name in enumerate(column_images):
            img_path = f"media/home/{img_name}"
            global_idx = col_idx + img_idx * 3
            
            # First image gets priority loading
            if col_idx == 0 and img_idx == 0:
                loading = 'eager'
                fetchpriority = ' fetchpriority="high"'
            else:
                loading = 'lazy'
                fetchpriority = ''
            
            html += f'                        <button type="button" class="home-gallery__item" data-index="{global_idx}" aria-label="Open image">\n'
            html += f'                            <img class="home-gallery__img" src="{img_path}" alt="Gallery image" loading="{loading}"{fetchpriority} width="800" height="1200" />\n'
            html += '                        </button>\n'
        
        html += '                    </div>\n'
    
    html += """                </div>
            </div>"""
    
    print("\nGenerated HTML:")
    print("=" * 80)
    print(html)
    print("=" * 80)
    print("\nCopy this HTML and paste it into index.html")
    print("Replace the gallery container section (lines ~85-115)")
    
    # Optionally write to a file
    output_file = Path("gallery-output.html")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print(f"\nAlso saved to: {output_file}")

if __name__ == "__main__":
    generate_gallery_html()
