/**
 * generate-icons.mjs
 * Generates resources/icon.png from scratch using only Node.js built-in modules.
 * Run: node scripts/generate-icons.mjs
 *
 * Produces a 256×256 PNG with the Echo brand icon:
 *   — #610000 (velvet red) background
 *   — White "E" lettermark with echo-wave arcs
 */

import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RESOURCES = join(__dirname, '../resources')

// ── CRC32 ──────────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.allocUnsafe(4); lenBuf.writeUInt32BE(data.length)
  const crcBuf = Buffer.allocUnsafe(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function ihdr(w, h) {
  const d = Buffer.alloc(13)
  d.writeUInt32BE(w, 0); d.writeUInt32BE(h, 4)
  d[8] = 8; d[9] = 2  // 8-bit RGB
  return chunk('IHDR', d)
}

function idat(pixels, w, h) {
  const raw = Buffer.allocUnsafe(h * (1 + w * 3))
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0 // None filter
    for (let x = 0; x < w; x++) {
      const dst = y * (1 + w * 3) + 1 + x * 3
      const src = (y * w + x) * 3
      raw[dst] = pixels[src]; raw[dst+1] = pixels[src+1]; raw[dst+2] = pixels[src+2]
    }
  }
  return chunk('IDAT', deflateSync(raw))
}

// ── Draw helpers ───────────────────────────────────────────────────────────
const SIZE = 256
const pixels = new Uint8Array(SIZE * SIZE * 3)

function setPixel(x, y, r, g, b) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return
  const i = (y * SIZE + x) * 3
  pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b
}

function fillRect(x0, y0, w, h, r, g, b) {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++)
      setPixel(x, y, r, g, b)
}

function fillCircle(cx, cy, radius, r, g, b) {
  for (let y = cy - radius; y <= cy + radius; y++)
    for (let x = cx - radius; x <= cx + radius; x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2)
        setPixel(x, y, r, g, b)
}

// Draw a thick arc (right half of ellipse) using pixel sampling
function drawArc(cx, cy, rx, ry, thickness, r, g, b, opacity = 1.0) {
  const t2 = (thickness / 2) ** 2
  for (let y = cy - ry - thickness; y <= cy + ry + thickness; y++) {
    for (let x = cx; x <= cx + rx + thickness; x++) {  // right half only
      // Distance from ellipse edge
      const nx = (x - cx) / rx
      const ny = (y - cy) / ry
      const d = Math.abs(Math.sqrt(nx*nx + ny*ny) - 1.0) * Math.min(rx, ry)
      if (d <= thickness / 2) {
        const a = Math.max(0, 1 - d / (thickness / 2)) * opacity
        // Blend with existing pixel
        const pi = (Math.round(y) * SIZE + Math.round(x)) * 3
        if (Math.round(x) >= 0 && Math.round(x) < SIZE && Math.round(y) >= 0 && Math.round(y) < SIZE) {
          pixels[pi]   = Math.round(pixels[pi]   * (1-a) + r * a)
          pixels[pi+1] = Math.round(pixels[pi+1] * (1-a) + g * a)
          pixels[pi+2] = Math.round(pixels[pi+2] * (1-a) + b * a)
        }
      }
    }
  }
}

// ── Rounded rectangle ──────────────────────────────────────────────────────
function fillRoundedRect(x0, y0, w, h, radius, r, g, b) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      // Corner check
      let inCorner = false
      if (x < x0 + radius && y < y0 + radius)
        inCorner = (x - (x0 + radius)) ** 2 + (y - (y0 + radius)) ** 2 > radius ** 2
      else if (x > x0 + w - radius && y < y0 + radius)
        inCorner = (x - (x0 + w - radius)) ** 2 + (y - (y0 + radius)) ** 2 > radius ** 2
      else if (x < x0 + radius && y > y0 + h - radius)
        inCorner = (x - (x0 + radius)) ** 2 + (y - (y0 + h - radius)) ** 2 > radius ** 2
      else if (x > x0 + w - radius && y > y0 + h - radius)
        inCorner = (x - (x0 + w - radius)) ** 2 + (y - (y0 + h - radius)) ** 2 > radius ** 2
      if (!inCorner) setPixel(x, y, r, g, b)
    }
  }
}

// ── Build the icon ─────────────────────────────────────────────────────────

// Background: #610000 (97, 0, 0) with rounded corners
fillRect(0, 0, SIZE, SIZE, 97, 0, 0)
// Round the corners (40px radius)
const BG = 40
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    let mask = true
    if (x < BG && y < BG) mask = (x - BG)**2 + (y - BG)**2 <= BG**2
    else if (x > SIZE-BG && y < BG) mask = (x - (SIZE-BG))**2 + (y - BG)**2 <= BG**2
    else if (x < BG && y > SIZE-BG) mask = (x - BG)**2 + (y - (SIZE-BG))**2 <= BG**2
    else if (x > SIZE-BG && y > SIZE-BG) mask = (x - (SIZE-BG))**2 + (y - (SIZE-BG))**2 <= BG**2
    if (!mask) {
      const i = (y * SIZE + x) * 3
      pixels[i] = 0; pixels[i+1] = 0; pixels[i+2] = 0
    }
  }
}

// Echo waveform arcs (right-facing, centred on left third)
const WCX = 82, WCY = 128
// Source dot
fillCircle(WCX, WCY, 9, 255, 255, 255)
// Arcs: (cx, cy, rx, ry, thickness, r, g, b, opacity)
drawArc(WCX, WCY, 22, 22, 10, 255, 255, 255, 0.95)
drawArc(WCX, WCY, 38, 38,  8, 255, 255, 255, 0.78)
drawArc(WCX, WCY, 54, 54,  7, 255, 255, 255, 0.60)
drawArc(WCX, WCY, 70, 70,  5, 255, 255, 255, 0.40)

// "E" lettermark (right side)
const EX = 158, EY = 78, EW = 18, EH = 100
// Vertical stem
fillRoundedRect(EX, EY, EW, EH, 4, 255, 255, 255)
// Top bar
fillRoundedRect(EX, EY, 62, EW, 4, 255, 255, 255)
// Middle bar (shorter)
fillRoundedRect(EX, EY + Math.round(EH/2) - Math.round(EW/2), 46, EW, 4, 255, 255, 255)
// Bottom bar
fillRoundedRect(EX, EY + EH - EW, 62, EW, 4, 255, 255, 255)

// ── Write PNG ──────────────────────────────────────────────────────────────
const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const png = Buffer.concat([PNG_SIG, ihdr(SIZE, SIZE), idat(pixels, SIZE, SIZE), chunk('IEND', Buffer.alloc(0))])

if (!existsSync(RESOURCES)) mkdirSync(RESOURCES, { recursive: true })
writeFileSync(join(RESOURCES, 'icon.png'), png)
console.log(`✓  resources/icon.png (${SIZE}×${SIZE}) generated`)
console.log('   To convert to ICO for Windows distribution:')
console.log('   npx png-to-ico resources/icon.png > resources/icon.ico')
