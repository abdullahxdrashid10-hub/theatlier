import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const exe = fs.existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')
  ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  : 'C:/Program Files/Google/Chrome/Application/chrome.exe'

const browser = await chromium.launch({ executablePath: exe, headless: true })
const page = await browser.newPage({ viewport: { width: 1040, height: 600 } })

const logoBuf = fs.readFileSync(path.join(ROOT, 'docs', 'logo-reference.png'))
const logoB64 = 'data:image/png;base64,' + logoBuf.toString('base64')

const heroBuf = fs.readFileSync(path.join(ROOT, 'screenshots', 'd1440_normal_hero.png'))
const heroB64 = 'data:image/png;base64,' + heroBuf.toString('base64')

const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      margin: 0;
      background: #151410;
      color: #E4C48F;
      font-family: system-ui, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      overflow: hidden;
    }
    .container {
      display: flex;
      gap: 32px;
      align-items: center;
    }
    .card {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: #1E1C17;
      border: 1px solid #3A2A1C;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 12px 32px rgba(0,0,0,0.5);
    }
    .card h3 {
      margin: 0 0 12px 0;
      font-size: 13px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #D0A971;
    }
    canvas {
      border: 1px solid #44301E;
      border-radius: 4px;
      background: #151410;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h3>Logo Reference Strokes Crop</h3>
      <canvas id="logoCanvas" width="460" height="460"></canvas>
    </div>
    <div class="card">
      <h3>Hero Animated Canvas Strokes Crop</h3>
      <canvas id="heroCanvas" width="460" height="460"></canvas>
    </div>
  </div>
  <script>
    function loadImage(src) {
      return new Promise((res) => {
        const img = new Image();
        img.onload = () => res(img);
        img.src = src;
      });
    }
    async function draw() {
      const [logoImg, heroImg] = await Promise.all([loadImage('${logoB64}'), loadImage('${heroB64}')]);
      
      const lc = document.getElementById('logoCanvas');
      const lctx = lc.getContext('2d');
      const lw = logoImg.naturalWidth;
      const lh = logoImg.naturalHeight;
      // Crop upper-right strokes from logo reference
      lctx.drawImage(logoImg, lw * 0.42, lh * 0.12, lw * 0.52, lh * 0.52, 0, 0, 460, 460);
      
      const hc = document.getElementById('heroCanvas');
      const hctx = hc.getContext('2d');
      const hw = heroImg.naturalWidth;
      const hh = heroImg.naturalHeight;
      // Crop upper-right strokes from rendered hero at similar scale
      hctx.drawImage(heroImg, hw * 0.47, hh * 0.08, hw * 0.38, hh * 0.38, 0, 0, 460, 460);
    }
    draw();
  </script>
</body>
</html>
`

await page.setContent(html)
await page.waitForTimeout(800)
await page.screenshot({ path: path.join(ROOT, 'screenshots', 'contact_sheet_comparison.png') })
console.log('Successfully generated screenshots/contact_sheet_comparison.png')
await browser.close()
