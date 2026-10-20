import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const artworks = [
  {
    slug: 'al-asr',
    file: 'al-asr-room-new.jpg',
    widthIn: 36,
    lengthIn: 48,
    // al-asr canvas coordinates on gallery entry wall
    box: { x: 0.237, y: 0.08, w: 0.531, h: 0.542 }
  },
  {
    slug: 'mountain-ridge',
    file: 'gilded-ridge-room.jpg',
    widthIn: 24,
    lengthIn: 36,
    // mountain-ridge canvas coordinates over media console
    box: { x: 0.540, y: 0.120, w: 0.248, h: 0.518 }
  },
  {
    slug: 'tajalli',
    file: 'tajalli-primary.jpg',
    widthIn: 36,
    lengthIn: 48,
    box: { x: 0.23, y: 0.05, w: 0.55, h: 0.53 }
  },
  {
    slug: 'nafs-e-rehmat',
    file: 'nafs-e-rehmat-primary.jpg',
    widthIn: 48,
    lengthIn: 36,
    box: { x: 0.14, y: 0.09, w: 0.76, h: 0.73 }
  },
  {
    slug: 'tajdeed',
    file: 'tajdeed-primary.jpg',
    widthIn: 36,
    lengthIn: 24,
    box: { x: 0.19, y: 0.14, w: 0.66, h: 0.52 }
  },
  {
    slug: 'ufaq-e-sukoon',
    file: 'ufaq-e-sukoon-primary.jpg',
    widthIn: 36,
    lengthIn: 24,
    box: { x: 0.21, y: 0.25, w: 0.61, h: 0.47 }
  },
  {
    slug: 'sukoon-e-khak',
    file: 'sukoon-e-khak-primary.jpg',
    widthIn: 36,
    lengthIn: 24,
    box: { x: 0.11, y: 0.12, w: 0.79, h: 0.61 }
  },
  {
    slug: 'iltija',
    file: 'iltija-primary.jpg',
    widthIn: 24,
    lengthIn: 36,
    box: { x: 0.27, y: 0.10, w: 0.46, h: 0.65 }
  },
  {
    slug: 'uns',
    file: 'uns-primary.jpg',
    widthIn: 24,
    lengthIn: 24,
    box: { x: 0.24, y: 0.08, w: 0.61, h: 0.50 }
  },
  {
    slug: 'kursi-e-jalal',
    file: 'kursi-e-jalal-primary.jpg',
    widthIn: 42,
    lengthIn: 36,
    box: { x: 0.22, y: 0.09, w: 0.64, h: 0.60 }
  },
  {
    slug: 'nuqoosh',
    file: 'nuqoosh-primary.jpg',
    widthIn: 36,
    lengthIn: 24,
    box: { x: 0.12, y: 0.06, w: 0.79, h: 0.76 }
  },
  {
    slug: 'yusra',
    file: 'yusra-primary.jpg',
    widthIn: 24,
    lengthIn: 36,
    box: { x: 0.23, y: 0.07, w: 0.58, h: 0.61 }
  },
  {
    slug: 'madar',
    file: 'madar-room.jpg',
    widthIn: 36,
    lengthIn: 24,
    // madar canvas coordinates in gallery hallway
    box: { x: 0.308, y: 0.252, w: 0.284, h: 0.374 }
  }
]

async function generate() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage()

  for (const art of artworks) {
    const srcPath = path.resolve('public/artworks', art.file)
    if (!fs.existsSync(srcPath)) {
      console.warn('File not found:', srcPath)
      continue
    }

    const b64 = fs.readFileSync(srcPath).toString('base64')

    const resultB64 = await page.evaluate(async ({ b64, art }) => {
      return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const ctx = canvas.getContext('2d')

          // Draw the base image
          ctx.drawImage(img, 0, 0)

          const box = art.box
          const bx = box.x * canvas.width
          const by = box.y * canvas.height
          const bw = box.w * canvas.width
          const bh = box.h * canvas.height

          // Architectural Dimension styling
          // Reference image: thin charcoal/black line, tick marks at endpoints, centered number
          const strokeColor = '#24201c'
          const fontSize = Math.max(14, Math.round(canvas.width * 0.019))
          const tickSize = Math.max(8, Math.round(fontSize * 0.75))
          const offset = Math.max(16, Math.round(fontSize * 1.25))

          ctx.font = `500 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
          ctx.textBaseline = 'middle'
          ctx.textAlign = 'center'
          ctx.lineWidth = 1.6
          ctx.strokeStyle = strokeColor
          ctx.fillStyle = strokeColor

          // 1. WIDTH LINE (Bottom horizontal line)
          const lineY = Math.min(canvas.height - 10, by + bh + offset)
          const leftX = Math.max(10, bx)
          const rightX = Math.min(canvas.width - 10, bx + bw)
          const widthText = String(art.widthIn)
          const widthTextMetrics = ctx.measureText(widthText)
          const textGap = widthTextMetrics.width + 16
          const midX = (leftX + rightX) / 2

          // Left tick (vertical)
          ctx.beginPath()
          ctx.moveTo(leftX, lineY - tickSize / 2)
          ctx.lineTo(leftX, lineY + tickSize / 2)
          ctx.stroke()

          // Right tick (vertical)
          ctx.beginPath()
          ctx.moveTo(rightX, lineY - tickSize / 2)
          ctx.lineTo(rightX, lineY + tickSize / 2)
          ctx.stroke()

          // Left segment of horizontal line
          ctx.beginPath()
          ctx.moveTo(leftX, lineY)
          ctx.lineTo(midX - textGap / 2, lineY)
          ctx.stroke()

          // Right segment of horizontal line
          ctx.beginPath()
          ctx.moveTo(midX + textGap / 2, lineY)
          ctx.lineTo(rightX, lineY)
          ctx.stroke()

          // Width Text
          ctx.fillText(widthText, midX, lineY)

          // 2. HEIGHT / LENGTH LINE (Right vertical line)
          const lineX = Math.min(canvas.width - 12, bx + bw + offset)
          const topY = Math.max(10, by)
          const bottomY = Math.min(canvas.height - 10, by + bh)
          const lengthText = String(art.lengthIn)
          const lengthTextMetrics = ctx.measureText(lengthText)
          const lengthGap = fontSize + 12
          const midY = (topY + bottomY) / 2

          // Top tick (horizontal)
          ctx.beginPath()
          ctx.moveTo(lineX - tickSize / 2, topY)
          ctx.lineTo(lineX + tickSize / 2, topY)
          ctx.stroke()

          // Bottom tick (horizontal)
          ctx.beginPath()
          ctx.moveTo(lineX - tickSize / 2, bottomY)
          ctx.lineTo(lineX + tickSize / 2, bottomY)
          ctx.stroke()

          // Top segment of vertical line
          ctx.beginPath()
          ctx.moveTo(lineX, topY)
          ctx.lineTo(lineX, midY - lengthGap / 2)
          ctx.stroke()

          // Bottom segment of vertical line
          ctx.beginPath()
          ctx.moveTo(lineX, midY + lengthGap / 2)
          ctx.lineTo(lineX, bottomY)
          ctx.stroke()

          // Height / Length Text
          ctx.fillText(lengthText, lineX, midY)

          resolve(canvas.toDataURL('image/jpeg', 0.92).split(',')[1])
        }
        img.src = 'data:image/jpeg;base64,' + b64
      })
    }, { b64, art })

    const destFile = path.resolve('public/artworks', `${art.slug}-dimension.jpg`)
    fs.writeFileSync(destFile, Buffer.from(resultB64, 'base64'))
    console.log(`Generated: ${art.slug}-dimension.jpg`)
  }

  await browser.close()
  console.log('All dimension images generated successfully.')
}

generate().catch(console.error)
