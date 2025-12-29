import os
from PIL import Image, ImageFilter
import shutil

# Configuration
TARGET_DIR = 'media/portfolio'
BACKUP_DIR = 'media/portfolio_backup'
MAX_DIMENSION = 2560 # 2560px (Standard 1440p/4K friendly width/height)
JPEG_QUALITY = 85

def optimize_images():
    # Create backup directory
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
        print(f"Created backup directory: {BACKUP_DIR}")

    # Walk through all files
    for root, dirs, files in os.walk(TARGET_DIR):
        for file in files:
            if file.lower().endswith(('.jpg', '.jpeg')):
                file_path = os.path.join(root, file)
                
                # Create relative path for backup structure
                rel_path = os.path.relpath(file_path, TARGET_DIR)
                backup_path = os.path.join(BACKUP_DIR, rel_path)
                
                # Ensure backup subdir exists
                os.makedirs(os.path.dirname(backup_path), exist_ok=True)
                
                # Backup original
                if not os.path.exists(backup_path):
                    shutil.copy2(file_path, backup_path)
                    print(f"Backed up: {rel_path}")
                
                try:
                    with Image.open(file_path) as img:
                        # Check if resize is needed
                        width, height = img.size
                        if width > MAX_DIMENSION or height > MAX_DIMENSION:
                            # Calculate new size maintaining aspect ratio
                            ratio = min(MAX_DIMENSION / width, MAX_DIMENSION / height)
                            new_size = (int(width * ratio), int(height * ratio))
                            
                            # High quality resize (LANCZOS)
                            img = img.resize(new_size, Image.Resampling.LANCZOS)
                            
                            # Apply slight sharpening to recover detail lost in downscaling
                            # UnsharpMask(radius=2, percent=150, threshold=3) is a common starting point
                            # But for general web use, a milder sharpen is safer
                            img = img.filter(ImageFilter.UnsharpMask(radius=1, percent=100, threshold=3))
                            
                            # Save optimized version
                            img.save(file_path, 'JPEG', quality=JPEG_QUALITY, optimize=True)
                            
                            print(f"Optimized: {rel_path} ({width}x{height} -> {new_size[0]}x{new_size[1]})")
                        else:
                            print(f"Skipped (already small enough): {rel_path}")
                            
                except Exception as e:
                    print(f"Error processing {file_path}: {e}")

if __name__ == '__main__':
    optimize_images()
