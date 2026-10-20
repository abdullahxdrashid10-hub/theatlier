import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

// Clean canvas crop bounding box (% coordinates [x, y, width, height])
const canvasArtworks = [
  {
    slug: 'tajalli',
    file: 'tajalli-primary.jpg',
    canvasBox: { x: 0.23, y: 0.05, w: 0.55, h: 0.53 },
  },
  {
    slug: 'tajdeed',
    file: 'tajdeed-primary.jpg',
    canvasBox: { x: 0.19, y: 0.14, w: 0.66, h: 0.52 },
  },
  {
    slug: 'nafs-e-rehmat',
    file: 'nafs-e-rehmat-primary.jpg',
    canvasBox: { x: 0.14, y: 0.09, w: 0.76, h: 0.73 },
  },
  {
    slug: 'ufaq-e-sukoon',
    file: 'ufaq-e-sukoon-primary.jpg',
    canvasBox: { x: 0.21, y: 0.25, w: 0.61, h: 0.47 },
  },
  {
    slug: 'sukoon-e-khak',
    file: 'sukoon-e-khak-primary.jpg',
    canvasBox: { x: 0.11, y: 0.12, w: 0.79, h: 0.61 },
  },
  {
    slug: 'iltija',
    file: 'iltija-primary.jpg',
    canvasBox: { x: 0.27, y: 0.10, w: 0.46, h: 0.65 },
  },
  {
    slug: 'uns',
    file: 'uns-primary.jpg',
    canvasBox: { x: 0.24, y: 0.08, w: 0.61, h: 0.50 },
  },
  {
    slug: 'kursi-e-jalal',
    file: 'kursi-e-jalal-primary.jpg',
    canvasBox: { x: 0.22, y: 0.09, w: 0.64, h: 0.60 },
  },
  {
    slug: 'nuqoosh',
    file: 'nuqoosh-primary.jpg',
    canvasBox: { x: 0.12, y: 0.06, w: 0.79, h: 0.76 },
  },
  {
    slug: 'yusra',
    file: 'yusra-primary.jpg',
    canvasBox: { x: 0.23, y: 0.07, w: 0.58, h: 0.61 },
  },
  {
    slug: 'madar',
    file: 'madar-primary.jpg',
    canvasBox: { x: 0.06, y: 0.07, w: 0.86, h: 0.83 },
  },
];

async function main() {
  console.log('Generating perspective raking angle views...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  for (const art of canvasArtworks) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1400, height: 1050 });

    const srcPath = path.resolve('public/artworks', art.file);
    const destPath = path.resolve('public/artworks', `${art.slug}-angle.jpg`);
    const data = fs.readFileSync(srcPath);
    const base64 = data.toString('base64');

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            width: 1400px;
            height: 1050px;
            background: radial-gradient(circle at 60% 40%, #1e1e23 0%, #0a0a0c 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            perspective: 1200px;
          }
          .gallery-wall {
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .canvas-wrapper {
            position: relative;
            transform: perspective(1000px) rotateY(-22deg) rotateX(3deg) scale(0.92);
            transform-style: preserve-3d;
            box-shadow: 25px 35px 70px rgba(0, 0, 0, 0.8), 5px 10px 20px rgba(0, 0, 0, 0.5);
            border-radius: 4px;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.08);
          }
          canvas {
            display: block;
            max-height: 780px;
            max-width: 900px;
            object-fit: cover;
          }
          .raking-light {
            position: absolute;
            inset: 0;
            background: linear-gradient(90deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 40%, rgba(0,0,0,0.3) 100%);
            pointer-events: none;
          }
        </style>
      </head>
      <body>
        <div class="gallery-wall">
          <div class="canvas-wrapper">
            <canvas id="cropCanvas"></canvas>
            <div class="raking-light"></div>
          </div>
        </div>
      </body>
      </html>
    `);

    await page.evaluate(async ({ b64, box }) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.getElementById('cropCanvas');
          const sx = Math.floor(img.naturalWidth * box.x);
          const sy = Math.floor(img.naturalHeight * box.y);
          const sw = Math.floor(img.naturalWidth * box.w);
          const sh = Math.floor(img.naturalHeight * box.h);

          canvas.width = sw;
          canvas.height = sh;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
          resolve();
        };
        img.src = 'data:image/jpeg;base64,' + b64;
      });
    }, { b64: base64, box: art.canvasBox });

    await page.waitForTimeout(100);
    await page.screenshot({ path: destPath, type: 'jpeg', quality: 90 });
    const stat = fs.statSync(destPath);
    console.log(`Saved ${art.slug}-angle.jpg (${(stat.size / 1024).toFixed(1)} KB)`);
    await page.close();
  }

  await browser.close();
  console.log('All perspective raking angle views generated successfully.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
