import { fillRect, setPixel } from '../shared/pixel/bitmap'
import type { Bitmap } from '../shared/pixel/bitmap'
import { GROUND_TOP } from '../sim/constants'
import type { Backdrop } from '../sim/types'
import { drawGround, drawMoon, drawSky, drawStars, drawSun, scatter } from './sky'

type Scene = { bitmap: Bitmap; clockMs: number; dawn: number }

function ridge(options: { bitmap: Bitmap; height: (x: number) => number; color: number; cap?: number }): void {
  for (let x = 0; x < options.bitmap.width; x += 1) {
    const top = GROUND_TOP - options.height(x)
    fillRect({ bitmap: options.bitmap, x, y: top, width: 1, height: GROUND_TOP - top, color: options.color })
    if (options.cap !== undefined) {
      setPixel({ bitmap: options.bitmap, x, y: top, color: options.cap })
    }
  }
}

function snow(scene: Scene): void {
  const { bitmap, clockMs } = scene
  drawSky({ bitmap, top: 0x0b132b, horizon: 0x3a506b, dawn: scene.dawn })
  drawStars({ bitmap, clockMs, count: 10, color: 0xdfe7fd })
  ridge({ bitmap, height: x => Math.round(6 + 4 * Math.abs(Math.sin(x / 9))), color: 0x1c2541, cap: 0xe0e6f0 })
  drawGround({ bitmap, top: 0xf8f9fa, body: 0xdbe4ee, seam: 0xb8c4d6, seamEvery: 9 })
  for (let index = 0; index < 14; index += 1) {
    const x = (scatter({ seed: 11, index, span: bitmap.width }) + Math.floor(clockMs / 90)) % bitmap.width
    const y = (scatter({ seed: 5, index, span: GROUND_TOP }) + Math.floor(clockMs / 140)) % GROUND_TOP
    setPixel({ bitmap, x, y, color: 0xffffff })
  }
}

function market(scene: Scene): void {
  const { bitmap, clockMs } = scene
  drawSky({ bitmap, top: 0x10002b, horizon: 0x3c096c, dawn: scene.dawn })
  ridge({ bitmap, height: x => (x % 14 < 10 ? 6 : 4), color: 0x240046, cap: 0x5a189a })
  fillRect({ bitmap, x: 0, y: 2, width: bitmap.width, height: 1, color: 0x2b2d42 })
  for (let x = 3; x < bitmap.width; x += 7) {
    const glow = (Math.floor(clockMs / 300) + x) % 4 === 0 ? 0xffd166 : 0xffb703
    fillRect({ bitmap, x, y: 3, width: 2, height: 2, color: 0xe63946 })
    setPixel({ bitmap, x, y: 5, color: glow })
  }
  drawGround({ bitmap, top: 0x8b5e3c, body: 0x5c3d24, seam: 0x3e2a18, seamEvery: 8 })
}

function hall(scene: Scene): void {
  const { bitmap } = scene
  fillRect({ bitmap, x: 0, y: 0, width: bitmap.width, height: GROUND_TOP, color: 0x5e3b25 })
  fillRect({ bitmap, x: 0, y: 1, width: bitmap.width, height: 1, color: 0x3b2416 })
  for (let x = 1; x < bitmap.width; x += 10) {
    fillRect({ bitmap, x, y: 3, width: 8, height: 9, color: 0xf1e3c6 })
    fillRect({ bitmap, x: x + 4, y: 3, width: 1, height: 9, color: 0xb08a5a })
    fillRect({ bitmap, x, y: 7, width: 8, height: 1, color: 0xb08a5a })
  }
  drawGround({ bitmap, top: 0xd4bf88, body: 0xc2a96e, seam: 0x9c8350, seamEvery: 12 })
}

function forest(scene: Scene): void {
  const { bitmap, clockMs } = scene
  drawSky({ bitmap, top: 0x081c15, horizon: 0x1b4332, dawn: scene.dawn })
  drawStars({ bitmap, clockMs, count: 6, color: 0xb7e4c7 })
  drawMoon({ bitmap, x: Math.max(30, bitmap.width - 30), y: 1, light: 0xf1faee, shade: 0xc9d6c3 })
  for (let x = 2; x < bitmap.width; x += 9) {
    fillRect({ bitmap, x, y: 4, width: 2, height: GROUND_TOP - 4, color: 0x0b2419 })
    fillRect({ bitmap, x: x - 2, y: 2, width: 6, height: 3, color: 0x123524 })
  }
  for (let step = 0; step < 8; step += 1) {
    setPixel({ bitmap, x: 6 + step, y: 3 + step, color: 0x74a58a })
    setPixel({ bitmap, x: bitmap.width - 20 + step, y: 10 - step, color: 0x74a58a })
  }
  drawGround({ bitmap, top: 0x2d6a4f, body: 0x1b4332, seam: 0x40916c, seamEvery: 7 })
}

function train(scene: Scene): void {
  const { bitmap, clockMs } = scene
  drawSky({ bitmap, top: 0x03045e, horizon: 0x0077b6, dawn: scene.dawn })
  const offset = Math.floor(clockMs / 60)
  ridge({ bitmap, height: x => Math.round(3 + 2 * Math.sin((x + offset) / 6)), color: 0x023e8a })
  for (let index = 0; index < 6; index += 1) {
    const x = bitmap.width - ((scatter({ seed: 9, index, span: bitmap.width }) + offset * 3) % bitmap.width)
    fillRect({ bitmap, x, y: 1 + scatter({ seed: 4, index, span: 8 }), width: 4, height: 1, color: 0x90e0ef })
  }
  drawGround({ bitmap, top: 0x6c757d, body: 0x343a40, seam: 0xadb5bd, seamEvery: 6 })
}

function town(scene: Scene): void {
  const { bitmap, clockMs } = scene
  drawSky({ bitmap, top: 0x1a0b2e, horizon: 0x4a1942, dawn: scene.dawn })
  drawStars({ bitmap, clockMs, count: 7, color: 0xffd6e0 })
  ridge({ bitmap, height: x => [8, 8, 8, 6, 6, 9, 9, 9, 7, 7, 7, 5][x % 12] ?? 6, color: 0x2a0f3a })
  for (let x = 1; x < bitmap.width; x += 4) {
    if ((x * 7 + Math.floor(clockMs / 2000)) % 3 !== 0) {
      setPixel({ bitmap, x, y: GROUND_TOP - 3, color: 0xffd166 })
    }
  }
  for (let x = 5; x < bitmap.width; x += 11) {
    fillRect({ bitmap, x, y: 2, width: 2, height: 2, color: 0xff4d6d })
  }
  drawGround({ bitmap, top: 0x5c5c66, body: 0x3d3d45, seam: 0x2a2a30, seamEvery: 5 })
}

function castle(scene: Scene): void {
  const { bitmap, clockMs } = scene
  drawSky({ bitmap, top: 0x140c08, horizon: 0x3a1f12, dawn: scene.dawn })
  for (let x = 0; x < bitmap.width; x += 12) {
    const shift = Math.round(2 * Math.sin((clockMs / 1800) + x))
    fillRect({ bitmap, x: x + 3, y: 0, width: 2, height: GROUND_TOP, color: 0x2e1a0f })
    fillRect({ bitmap, x, y: 4 + shift, width: 10, height: 1, color: 0x6b4226 })
    fillRect({ bitmap, x: x + 6, y: 6 + shift, width: 3, height: 3, color: 0xf4d58d })
  }
  drawGround({ bitmap, top: 0x7f4f24, body: 0x4a2c17, seam: 0x2e1a0f, seamEvery: 10 })
}

function sunrise(scene: Scene): void {
  const { bitmap } = scene
  drawSky({ bitmap, top: 0x0b132b, horizon: 0x3a506b, dawn: scene.dawn })
  drawSun(scene)
  ridge({ bitmap, height: x => Math.round(2 + 1.5 * Math.abs(Math.sin(x / 7))), color: 0x3c1642, cap: 0x7b2d5b })
  drawGround({ bitmap, top: 0xffd6a5, body: 0xe8b88a, seam: 0xc98f62, seamEvery: 9 })
}

const SCENES: Record<Backdrop, (scene: Scene) => void> = { snow, market, hall, forest, train, town, castle }

export function drawBackdrop(options: { bitmap: Bitmap; backdrop: Backdrop; clockMs: number; dawn: number }): void {
  const scene = { bitmap: options.bitmap, clockMs: options.clockMs, dawn: options.dawn }
  if (options.dawn > 0) {
    sunrise(scene)
    return
  }
  SCENES[options.backdrop](scene)
}
