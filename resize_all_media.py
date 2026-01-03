"""
Resize all images in media folder to have a maximum long edge of 2560px
"""
import os
from pathlib import Path
from PIL import Image

MEDIA_DIR = Path("media")
MAX_LONG_EDGE = 2560
TOLERANCE = 100  # Skip if within 100px of target
QUALITY = 90

# Image extensions to process
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'}

def resize_image(image_path):
    """Resize image if its long edge exceeds MAX_LONG_EDGE"""
    try:
        with Image.open(image_path) as img:
            width, height = img.size
            long_edge = max(width, height)
            
            # Skip if already within tolerance
            if long_edge <= MAX_LONG_EDGE + TOLERANCE:
                return False, f"Skipped (already optimal: {width}x{height})"
            
            # Calculate new dimensions
            if width > height:
                new_width = MAX_LONG_EDGE
                new_height = int(height * (MAX_LONG_EDGE / width))
            else:
                new_height = MAX_LONG_EDGE
                new_width = int(width * (MAX_LONG_EDGE / height))
            
            # Resize
            resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Save with optimization
            if image_path.suffix.lower() in {'.jpg', '.jpeg'}:
                resized.save(image_path, 'JPEG', quality=QUALITY, optimize=True)
            elif image_path.suffix.lower() == '.png':
                resized.save(image_path, 'PNG', optimize=True)
            elif image_path.suffix.lower() == '.webp':
                resized.save(image_path, 'WEBP', quality=QUALITY)
            else:
                resized.save(image_path)
            
            return True, f"Resized from {width}x{height} to {new_width}x{new_height}"
            
    except Exception as e:
        return False, f"Error: {str(e)}"

def main():
    if not MEDIA_DIR.exists():
        print(f"Error: {MEDIA_DIR} directory not found")
        return
    
    print(f"Scanning {MEDIA_DIR} for images...")
    print(f"Target: {MAX_LONG_EDGE}px long edge (tolerance: {TOLERANCE}px)\n")
    
    resized_count = 0
    skipped_count = 0
    error_count = 0
    
    # Recursively find all images
    for image_path in MEDIA_DIR.rglob('*'):
        if image_path.is_file() and image_path.suffix.lower() in IMAGE_EXTENSIONS:
            relative_path = image_path.relative_to(MEDIA_DIR)
            success, message = resize_image(image_path)
            
            if success:
                print(f"✓ {relative_path}: {message}")
                resized_count += 1
            elif "Error" in message:
                print(f"✗ {relative_path}: {message}")
                error_count += 1
            else:
                print(f"- {relative_path}: {message}")
                skipped_count += 1
    
    print(f"\n{'='*60}")
    print(f"Summary:")
    print(f"  Resized: {resized_count}")
    print(f"  Skipped: {skipped_count}")
    print(f"  Errors:  {error_count}")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
