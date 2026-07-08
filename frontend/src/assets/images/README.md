r resolution source
2. Don't upscale small images
3. Use SVG for logos when possible

---

## 📞 Support

For image-related issues:
1. Check file format and size
2. Verify file path
3. Check browser console for errors
4. Contact development team

---

**Last Updated**: April 13, 2026
**Status**: ⚠️ Awaiting DMU logo and campus images
**Priority**: High - Replace placeholders before production
`

4. **Verify**:
   - Open http://localhost:5173/login
   - Check if logo appears correctly
   - Open http://localhost:5173/
   - Check if campus images load

---

## 🐛 Troubleshooting

### Logo Not Showing
1. Check file name: `dmu-logo.png` (case-sensitive)
2. Check file location: `frontend/src/assets/images/branding/`
3. Restart dev server
4. Clear browser cache

### Image Too Large
1. Compress using TinyPNG
2. Resize to recommended dimensions
3. Convert to appropriate format

### Blurry Images
1. Use highee image techniques:
```jsx
<img 
  src={dmuLogo} 
  alt="DMU Logo" 
  className="w-full h-full object-contain"
/>
```

---

## 🚀 Quick Start

1. **Add DMU Logo**:
   ```bash
   # Place your logo file
   frontend/src/assets/images/branding/dmu-logo.png
   ```

2. **Add Campus Images** (optional):
   ```bash
   # Place campus photos
   frontend/src/assets/images/campus/campus-main.jpg
   frontend/src/assets/images/campus/library.jpg
   ```

3. **Restart Dev Server**:
   ```bash
   cd frontend
   npm run dev
   `` `#0d2f52`
- **Light Gold**: `#f4d03f`

### Logo Usage
- ✅ Use on white or light backgrounds
- ✅ Use on dark blue backgrounds (with white version)
- ✅ Maintain aspect ratio
- ✅ Keep clear space around logo
- ❌ Don't distort or stretch
- ❌ Don't change colors
- ❌ Don't add effects or shadows

---

## 📱 Responsive Considerations

Images are automatically optimized for different screen sizes:

- **Desktop**: Full resolution
- **Tablet**: Medium resolution
- **Mobile**: Compressed version

The code uses responsiv: RGB
Resolution: 72 DPI (web)
File Size: < 500KB
```

---

## 🔄 Fallback Images

If you don't add custom images immediately, the system will:
- **Logo**: Use SVG placeholder (blue shield with "DMU")
- **Campus Photos**: Use Unsplash placeholder images

**Note**: Placeholder images are fine for development, but please replace them with actual DMU images before production deployment.

---

## 🎨 Brand Guidelines

### DMU Brand Colors
- **Primary Blue**: `#0A2540`
- **Burnished Gold**: `#D4AF37`
- **Light Blue**:lding photo with DMU logo overlay
- **Benefits Section**: Dashboard preview image
- **Footer**: DMU logo (optional)

### Dashboard Layout
- **Sidebar**: DMU logo icon (optional)
- **Header**: DMU logo (optional)

---

## 📐 Recommended Specifications

### Logo Specifications
```
Format: PNG
Background: Transparent
Size: 512x512px (1:1 ratio)
Color Mode: RGB
Resolution: 72 DPI (web)
File Size: < 200KB
```

### Campus Photo Specifications
```
Format: JPG
Size: 1920x1080px (16:9 ratio)
Quality: 80-85%
Color Modensparent background)
   - Photos: JPG (better compression)
   - Icons: SVG (scalable)

### Tools for Optimization

- **Online**: TinyPNG, Squoosh, Compressor.io
- **Desktop**: ImageOptim (Mac), FileOptimizer (Windows)
- **CLI**: `imagemagick`, `pngquant`

---

## 🎯 Current Image Usage

### Login Portal (`/login`)
- **Left Panel**: DMU logo (white background circle)
- **Mobile Header**: DMU logo (smaller version)
- **Background**: Topographic pattern (SVG)

### Landing Page (`/`)
- **Hero Section**: Campus buimpusImage from '../assets/images/campus/campus-main.jpg'
// import dashboardImage from '../assets/images/campus/dashboard-preview.jpg'
```

---

## 🖼️ Image Optimization Tips

### Before Adding Images

1. **Resize**: Use appropriate dimensions
   - Logo: 512x512px
   - Campus photos: 1920x1080px

2. **Compress**: Reduce file size without losing quality
   - Use [TinyPNG](https://tinypng.com/) for PNG
   - Use [Squoosh](https://squoosh.app/) for JPG

3. **Format**: Choose the right format
   - Logo: PNG (tramages/campus/campus-building.jpg
```

### Step 3: Update Code (if needed)

The code is already configured to use local images. Once you add the files, they will automatically be used.

**Login Portal** (`frontend/src/pages/LoginPortal.jsx`):
```javascript
import dmuLogo from '../assets/images/branding/dmu-logo.png'
```

**Landing Page** (`frontend/src/pages/LandingPage.jsx`):
```javascript
import dmuLogo from '../assets/images/branding/dmu-logo.png'
// Uncomment these lines after adding campus images:
// import ca*:
   - Export as PNG with transparent background
   - Recommended size: 512x512px
   - Name it: `dmu-logo.png`

2. **Campus Photos**:
   - Use high-quality photos of DMU campus
   - Resize to 1920x1080px
   - Optimize for web (use tools like TinyPNG)
   - Name them descriptively: `campus-main.jpg`, `library.jpg`, etc.

### Step 2: Place Files

```bash
# Copy your logo
frontend/src/assets/images/branding/dmu-logo.png

# Copy campus images
frontend/src/assets/images/campus/campus-main.jpg
frontend/src/assets/i 200KB
- **Usage**: Login portal, landing page, navigation header

**Current Status**: ⚠️ **Please add your actual DMU logo**

### Campus Images (`campus/`)
- **Format**: JPG or PNG
- **Recommended Size**: 1920x1080px (Full HD)
- **Aspect Ratio**: 16:9 or 4:3
- **File Size**: < 500KB each (optimize for web)
- **Usage**: Landing page hero section, about section

**Current Status**: ⚠️ **Using placeholder images from Unsplash**

---

## 📝 How to Add Your Images

### Step 1: Prepare Your Images

1. **DMU Logo*── dmu-logo.svg          ← SVG version (optional, for scalability)
│
└── campus/
    ├── campus-main.jpg       ← Main campus building photo
    ├── campus-building.jpg   ← Additional campus photos
    ├── dashboard-preview.jpg ← Dashboard screenshot (optional)
    └── library.jpg           ← Library or other facilities (optional)
```

---

## 🎨 Image Requirements

### DMU Logo (`branding/dmu-logo.png`)
- **Format**: PNG with transparent background
- **Recommended Size**: 512x512px or 1024x1024px
- **File Size**: <
## 📁 Folder Structure

```
frontend/src/assets/images/
├── branding/
│   ├── dmu-logo.png          ← Place your DMU logo here (PNG format)
│   ├── dmu-logo-white.png    ← White version for dark backgrounds (optional)
│   └ment System - Image Assets
# 📸 DMU Property Manage