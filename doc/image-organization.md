# Portfolio Image Organization Guide

## 📁 Structure Created

```
media/
├── branding/                      # Brand assets (logos, favicons)
│   └── Logo.png
│
├── portfolio/                     # Main portfolio images
│   ├── golden-hour-portraits/     # Each project gets its own folder
│   │   ├── hero.webp             # WebP format (modern browsers)
│   │   └── hero.jpg              # JPEG fallback (older browsers)
│   ├── urban-editorial/
│   ├── destination-wedding/
│   └── studio-sessions/
│
└── thumbnails/                    # Low-res previews for lazy loading
    ├── golden-hour.webp          # Tiny versions (~20kb)
    └── urban-editorial.webp
```

## 📸 How to Add Your Images

### **Step 1: Export from Lightroom/Photoshop**

**Specifications:**
- **Dimensions**: 1200px × 1600px (portrait) or 1600px × 1200px (landscape)
- **Quality**: 80-85% (balance between quality/size)
- **Format**: Export both JPEG and WebP
- **Color Space**: sRGB (for web)
- **Max File Size**: 150-250kb per image

### **Step 2: Place Images**

Place your images in the appropriate project folder:

```bash
# Example for "Golden Hour Portraits" project
media/portfolio/golden-hour-portraits/hero.jpg
media/portfolio/golden-hour-portraits/hero.webp
```

### **Step 3: Update HTML**

Replace the picsum.photos URLs with your local images:

```html
<!-- Before -->
<img src="https://picsum.photos/1200/1600?random=1" alt="...">

<!-- After -->
<picture>
  <source srcset="media/portfolio/golden-hour-portraits/hero.webp" type="image/webp">
  <img src="media/portfolio/golden-hour-portraits/hero.jpg" alt="Golden Hour Portraits">
</picture>
```

## 🎨 Image Optimization Tools

### **Online (Free)**
- **Squoosh.app** - Google's image optimizer
- **TinyPNG** - Compress PNGs and JPEGs
- **CloudConvert** - Convert to WebP

### **Desktop Software**
- **Adobe Photoshop** - Export for Web (Legacy)
- **GIMP** - Free Photoshop alternative
- **XnConvert** - Batch processing

### **Command Line (PowerShell)**

I can create a script to auto-optimize your images. Just drop JPEGs in the folders and run:

```powershell
.\optimize-images.ps1
```

## 📏 Naming Conventions

### **Portfolio Images**
- `hero.jpg` / `hero.webp` - Main portfolio image
- `detail-1.jpg` - Additional project images (if needed)
- `detail-2.jpg` - More angles/shots

### **Thumbnails**
- `golden-hour.webp` - Match project folder name
- `urban-editorial.webp`

### **DO NOT**
- ❌ `DSC_1234.jpg` - Camera filenames
- ❌ `IMG_5678.jpg` - Generic names
- ❌ `final_final_v2.jpg` - Version names
- ❌ Spaces in filenames - Use hyphens instead

## ⚡ Performance Tips

### **Image Sizes**
- **Hero Images**: 1200×1600px @ 80% quality = ~150-200kb
- **Thumbnails**: 300×400px @ 60% quality = ~15-25kb

### **Responsive Images** (Advanced)

For even better performance, create multiple sizes:

```
golden-hour-portraits/
├── hero-small.webp    # 600×800  (mobile)
├── hero-medium.webp   # 1200×1600 (tablet)
├── hero-large.webp    # 1800×2400 (desktop)
└── hero.jpg           # Fallback
```

Then use `srcset`:

```html
<img 
  srcset="
    media/portfolio/golden-hour-portraits/hero-small.webp 600w,
    media/portfolio/golden-hour-portraits/hero-medium.webp 1200w,
    media/portfolio/golden-hour-portraits/hero-large.webp 1800w
  "
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 80vw"
  src="media/portfolio/golden-hour-portraits/hero.jpg"
  alt="Golden Hour Portraits"
>
```

## 🚀 Cloudflare Pages Optimization

When deployed to Cloudflare Pages, you get **automatic image optimization**:

1. **Image Resizing** - Cloudflare serves optimal sizes
2. **Format Conversion** - Auto-converts to WebP/AVIF
3. **Lazy Loading** - Built-in lazy load
4. **CDN Caching** - Global edge network

### Enable in `wrangler.toml`:

```toml
[site]
bucket = "./"

[build]
command = ""
cwd = ""

[env.production]
vars = { CF_IMAGE_OPTIMIZATION = "true" }
```

## ✅ Checklist

Before uploading images:

- [ ] Resized to 1200×1600px
- [ ] Compressed to 80-85% quality
- [ ] Exported as both JPEG and WebP
- [ ] Named descriptively (no camera filenames)
- [ ] Placed in correct project folder
- [ ] File size under 250kb
- [ ] Updated HTML image paths
- [ ] Tested in browser (local server)

## 🔍 Example File Sizes

**Good:**
- `hero.webp` - 145kb ✅
- `hero.jpg` - 198kb ✅

**Too Large:**
- `hero.jpg` - 1.2mb ❌ (needs compression)

**Too Small:**
- `hero.webp` - 15kb ❌ (quality too low)

## 📞 Need Help?

Run this to check your image sizes:

```powershell
Get-ChildItem -Path "media\portfolio" -Recurse -Include *.jpg,*.webp | 
  Select-Object Name, @{Name="SizeKB";Expression={[math]::Round($_.Length/1KB,2)}} | 
  Sort-Object SizeKB -Descending
```
