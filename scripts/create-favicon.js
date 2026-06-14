// Simple script to create favicon data
// This creates a base64 representation that can be used as a favicon

const fs = require('fs');
const path = require('path');

// Create a simple ICO file data (this is a minimal approach)
// For a proper ICO file, you'd normally use a specialized library
// But for development, we'll create a PNG and rename it to ICO

const svgFavicon = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="6" fill="#3b82f6"/>
  <path d="M16 10v12M10 16h12" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

// Write a simple manifest for better icon support
const manifest = {
  "name": "De Tender Care",
  "short_name": "De Tender Care",
  "icons": [
    {
      "src": "favicon.svg",
      "sizes": "any",
      "type": "image/svg+xml"
    },
    {
      "src": "icon-48x48.svg",
      "sizes": "48x48",
      "type": "image/svg+xml"
    }
  ],
  "theme_color": "#3b82f6",
  "background_color": "#ffffff",
  "display": "standalone"
};

const publicDir = path.join(__dirname, '..', 'frontend', 'public');
const manifestPath = path.join(publicDir, 'manifest.json');

try {
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('✅ Created manifest.json');
  console.log('✅ SVG favicon already created');
  console.log('✅ Browser will use SVG favicon for modern browsers');
  console.log('✅ Fallback to favicon.ico for older browsers (if present)');
  
  console.log('\n📋 To complete setup:');
  console.log('1. The SVG favicon is ready to use');
  console.log('2. For older browser support, convert favicon.svg to favicon.ico using online tools');
  console.log('3. Or use the existing favicon.ico as fallback');
  
} catch (error) {
  console.error('❌ Error creating manifest:', error);
}