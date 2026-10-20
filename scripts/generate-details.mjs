import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

// Macro crop bounding boxes (% coordinates [x, y, width, height])
const artworks = [
  {
    slug: 'tajalli',
    file: 'tajalli-primary.jpg',
    // Center circle with Allah calligraphy & gold celestial burst
    crop: { x: 0.28, y: 0.16, w: 0.44, h: 0.36 },
  },
  {
    slug: 'tajdeed',
    file: 'tajdeed-primary.jpg',
    // Dynamic winged strokes and calligraphy
    crop: { x: 0.25, y: 0.18, w: 0.55, h: 0.44 },
  },
  {
    slug: 'nafs-e-rehmat',
    file: 'nafs-e-rehmat-primary.jpg',
    // Gold drip impasto crest and Kufic lettering
    crop: { x: 0.16, y: 0.12, w: 0.68, h: 0.60 },
  },
  {
    slug: 'ufaq-e-sukoon',
    file: 'ufaq-e-sukoon-primary.jpg',
    // Heavy impasto palette knife peaks & ridges
    crop: { x: 0.25, y: 0.32, w: 0.52, h: 0.38 },
  },
  {
    slug: 'sukoon-e-khak',
    file: 'sukoon-e-khak-primary.jpg',
    // Terracotta and sienna geometric block texture
    crop: { x: 0.15, y: 0.16, w: 0.65, h: 0.55 },
  },
  {
    slug: 'iltija',
    file: 'iltija-primary.jpg',
    // Gold drip band and calligraphy
    crop: { x: 0.30, y: 0.22, w: 0.40, h: 0.45 },
  },
  {
    slug: 'uns',
    file: 'uns-primary.jpg',
    // Steaming coffee cup, beans and swirling impasto steam
    crop: { x: 0.32, y: 0.16, w: 0.46, h: 0.42 },
  },
  {
    slug: 'kursi-e-jalal',
    file: 'kursi-e-jalal-primary.jpg',
    // Sculpted Allah script and circular brushstrokes
    crop: { x: 0.32, y: 0.20, w: 0.48, h: 0.42 },
  },
  {
    slug: 'nuqoosh',
    file: 'nuqoosh-primary.jpg',
    // 3D textured impasto tablets grid
    crop: { x: 0.45, y: 0.18, w: 0.36, h: 0.55 },
  },
  {
    slug: 'yusra',
    file: 'yusra-primary.jpg',
    // Seafoam wave impasto meeting gold sand and calligraphy
    crop: { x: 0.30, y: 0.25, w: 0.45, h: 0.45 },
  },
  {
    slug: 'madar',
    file: 'madar-primary.jpg',
    // Raised spiral sun and textured quadrant
    crop: { x: 0.15, y: 0.10, w: 0.38, h: 0.45 },
  },
];

async function main() {
  console.log('Generating high-resolution macro detail crops...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();

  for (const art of artworks) {
    const srcPath = path.resolve('public/artworks', art.file);
    const destPath = path.resolve('public/artworks', `${art.slug}-detail.jpg`);

    const data = fs.readFileSync(srcPath);
    const base64 = data.toString('base64');

    const croppedBase64 = await page.evaluate(async ({ b64, crop }) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const sx = Math.floor(img.naturalWidth * crop.x);
          const sy = Math.floor(img.naturalHeight * crop.y);
          const sw = Math.floor(img.naturalWidth * crop.w);
          const sh = Math.floor(img.naturalHeight * crop.h);

          // Render at crisp target size
          canvas.width = Math.min(1200, sw);
          canvas.height = Math.min(1200, sh);

          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

          resolve(canvas.toDataURL('image/jpeg', 0.92));
        };
        img.src = 'data:image/jpeg;base64,' + b64;
      });
    }, { b64: base64, crop: art.crop });

    const buffer = Buffer.from(croppedBase64.replace(/^data:image\/jpeg;base64,/, ''), 'base64');
    fs.writeFileSync(destPath, buffer);
    console.log(`Saved ${art.slug}-detail.jpg (${(buffer.length / 1024).toFixed(1)} KB)`);
  }

  await browser.close();
  console.log('All macro detail crops generated successfully.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
