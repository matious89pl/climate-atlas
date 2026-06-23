// Generate the social share image (og.png, 1200×630) and app icons, rendered to
// match the Climate Atlas look. Run with: npm run make-og
// Uses system fonts (Georgia / Helvetica) via resvg so it needs no font downloads.

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC = resolve(__dirname, '../public')

// brand palette (hex approximations of the app's oklch tokens)
const C = {
  paper: '#FBF7EF',
  ink: '#322E28',
  ink2: '#6E6358',
  ink3: '#9A8E80',
  a: '#C15A2B', // city A — terracotta (Sydney)
  b: '#3C6E9E', // city B — slate blue (London)
  hair: '#E7DFD1',
  warm: '#F4DBB6',
  cool: '#D2E2F1',
}

function ogSvg() {
  // Two crossing temperature curves: A (warm) is a valley (hot at the ends of a
  // southern-hemisphere year), B (cool) is a hill — the signature of the app.
  const aCurve = 'M 80 430 C 320 436 450 566 600 568 C 750 566 880 436 1120 430'
  const bCurve = 'M 80 568 C 320 562 450 432 600 430 C 750 432 880 562 1120 568'
  const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
  const monthTicks = months
    .map((m, i) => {
      const x = 80 + ((1120 - 80) * (i + 0.5)) / 12
      return `<text x="${x.toFixed(1)}" y="604" font-family="Helvetica, Arial, sans-serif" font-size="17" font-weight="700" letter-spacing="1" fill="${C.ink3}" text-anchor="middle">${m}</text>`
    })
    .join('')
  const grid = [462, 499, 536]
    .map((y) => `<line x1="80" x2="1120" y1="${y}" y2="${y}" stroke="${C.hair}" stroke-width="1.5"/>`)
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="gw" cx="100%" cy="0%" r="85%">
      <stop offset="0%" stop-color="${C.warm}" stop-opacity="0.75"/>
      <stop offset="60%" stop-color="${C.warm}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="gc" cx="0%" cy="0%" r="80%">
      <stop offset="0%" stop-color="${C.cool}" stop-opacity="0.6"/>
      <stop offset="55%" stop-color="${C.cool}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1200" height="630" fill="${C.paper}"/>
  <rect width="1200" height="630" fill="url(#gw)"/>
  <rect width="1200" height="630" fill="url(#gc)"/>
  <rect x="18" y="18" width="1164" height="594" rx="20" fill="none" stroke="${C.hair}" stroke-width="2"/>

  <text x="80" y="104" font-family="Helvetica, Arial, sans-serif" font-size="23" font-weight="700" letter-spacing="7" fill="${C.ink3}">CLIMATE ATLAS</text>

  <text x="76" y="232" font-family="Georgia, 'Times New Roman', serif" font-size="116" font-weight="700">
    <tspan fill="${C.a}">Sydney</tspan><tspan fill="${C.ink3}" font-style="italic" font-size="66" font-weight="400"> vs </tspan><tspan fill="${C.b}">London</tspan>
  </text>

  <text x="80" y="300" font-family="Georgia, 'Times New Roman', serif" font-size="33" fill="${C.ink2}">Two cities laid over one calendar year — compared, measure for measure.</text>

  <text x="80" y="352" font-family="Helvetica, Arial, sans-serif" font-size="19" font-weight="700" letter-spacing="3" fill="${C.ink3}">TEMPERATURE&#160;&#160;·&#160;&#160;SUNSHINE&#160;&#160;·&#160;&#160;RAIN &amp; SNOW&#160;&#160;·&#160;&#160;WIND&#160;&#160;·&#160;&#160;UV INDEX</text>

  ${grid}
  <path d="${aCurve}" fill="none" stroke="${C.a}" stroke-width="5" stroke-linecap="round"/>
  <path d="${bCurve}" fill="none" stroke="${C.b}" stroke-width="5" stroke-linecap="round"/>
  <circle cx="80" cy="430" r="7" fill="${C.a}"/>
  <circle cx="1120" cy="430" r="7" fill="${C.a}"/>
  <circle cx="80" cy="568" r="7" fill="${C.b}"/>
  <circle cx="1120" cy="568" r="7" fill="${C.b}"/>
  ${monthTicks}

  <text x="1120" y="104" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="${C.ink3}" text-anchor="end">12 years of reanalysis data</text>
  <text x="80" y="586" font-family="Helvetica, Arial, sans-serif" font-size="0" fill="${C.ink3}"></text>
</svg>`
}

function iconSvg() {
  // rounded-square emblem: two crossing curves in the brand colours
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="${C.paper}"/>
  <rect x="6" y="6" width="500" height="500" rx="106" fill="none" stroke="${C.hair}" stroke-width="8"/>
  <path d="M 96 168 C 200 176 230 344 256 346 C 282 344 312 176 416 168" fill="none" stroke="${C.a}" stroke-width="34" stroke-linecap="round"/>
  <path d="M 96 346 C 200 338 230 170 256 168 C 282 170 312 338 416 346" fill="none" stroke="${C.b}" stroke-width="34" stroke-linecap="round"/>
</svg>`
}

function render(svg, width, outfile) {
  const r = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: true, defaultFontFamily: 'Georgia' },
    background: C.paper,
  })
  const png = r.render().asPng()
  writeFileSync(resolve(PUBLIC, outfile), png)
  console.log(`  wrote public/${outfile} (${(png.length / 1024).toFixed(0)} KB)`)
}

mkdirSync(PUBLIC, { recursive: true })
console.log('Rendering social image + icons…')
render(ogSvg(), 1200, 'og.png')
render(iconSvg(), 512, 'icon-512.png')
render(iconSvg(), 192, 'icon-192.png')
render(iconSvg(), 180, 'apple-touch-icon.png')
console.log('Done.')
