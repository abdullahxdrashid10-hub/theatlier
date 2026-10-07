// Generates the local SVG placeholder images in /public/placeholders from src/data/paintings.js.
// Run with: npm run placeholders
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import paintings from '../src/data/paintings.js'

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/placeholders')
mkdirSync(outDir, { recursive: true })

const PALETTE = ['#E4C48F', '#D0A971', '#876D4F', '#4B3D2C', '#B4A187', '#F2DEBF']

// Small deterministic PRNG so output is stable between runs.
function rng(seed) {
  let s = seed * 9301 + 49297
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function build(painting, variant) {
  const scale = 8
  const w = painting.widthCm * scale
  const h = painting.heightCm * scale
  const rand = rng(painting.id * 7 + (variant === 'detail' ? 101 : 0))
  const no = String(painting.id).padStart(2, '0')
  const strokeCount = variant === 'detail' ? 5 : 9

  let defs = ''
  let strokes = ''
  for (let i = 0; i < strokeCount; i += 1) {
    const c1 = PALETTE[Math.floor(rand() * PALETTE.length)]
    const c2 = PALETTE[Math.floor(rand() * PALETTE.length)]
    const sw = (variant === 'detail' ? 0.22 : 0.1) * Math.min(w, h) * (0.6 + rand() * 0.8)
    const x1 = rand() * w * 1.2 - w * 0.1
    const y1 = rand() * h
    const x2 = rand() * w * 1.2 - w * 0.1
    const y2 = rand() * h
    const cx = (x1 + x2) / 2 + (rand() - 0.5) * w * 0.5
    const cy = (y1 + y2) / 2 + (rand() - 0.5) * h * 0.5
    defs += `<linearGradient id="g${i}" gradientUnits="userSpaceOnUse" x1="${x1.toFixed(0)}" y1="${y1.toFixed(0)}" x2="${x2.toFixed(0)}" y2="${y2.toFixed(0)}"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`
    strokes += `<path d="M${x1.toFixed(0)} ${y1.toFixed(0)} Q${cx.toFixed(0)} ${cy.toFixed(0)} ${x2.toFixed(0)} ${y2.toFixed(0)}" stroke="url(#g${i})" stroke-width="${sw.toFixed(0)}" stroke-linecap="round" fill="none" opacity="${(0.35 + rand() * 0.45).toFixed(2)}"/>`
  }

  const label = variant === 'detail' ? `PLACEHOLDER · DETAIL ${no}` : `PLACEHOLDER · No. ${no}`
  const fs = Math.max(14, Math.round(Math.min(w, h) * 0.032))

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${label}">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1E1C17"/><stop offset="1" stop-color="#151410"/></linearGradient>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${painting.id}"/><feColorMatrix values="0 0 0 0 0.9  0 0 0 0 0.75  0 0 0 0 0.5  0 0 0 0.09 0"/></filter>
<filter id="blur"><feGaussianBlur stdDeviation="${Math.round(Math.min(w, h) * 0.006)}"/></filter>
${defs}
</defs>
<rect width="${w}" height="${h}" fill="url(#bg)"/>
<g filter="url(#blur)">${strokes}</g>
<rect width="${w}" height="${h}" filter="url(#grain)"/>
<rect x="${fs}" y="${fs}" width="${w - fs * 2}" height="${h - fs * 2}" fill="none" stroke="#876D4F" stroke-width="1" opacity="0.6"/>
<text x="${w / 2}" y="${h - fs * 2.2}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${fs}" letter-spacing="${(fs * 0.3).toFixed(1)}" fill="#F2DEBF" opacity="0.9">${label}</text>
</svg>
`
}

for (const painting of paintings) {
  const no = String(painting.id).padStart(2, '0')
  writeFileSync(path.join(outDir, `placeholder-${no}.svg`), build(painting, 'main'))
  writeFileSync(path.join(outDir, `placeholder-${no}-detail.svg`), build(painting, 'detail'))
}
console.log(`Wrote ${paintings.length * 2} placeholder SVGs to ${outDir}`)
