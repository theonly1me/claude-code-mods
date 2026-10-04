import { fillRect, setPixel } from '../shared/pixel/bitmap'
import type { Bitmap, Color } from '../shared/pixel/bitmap'
import { mixColors, toRadians } from '../shared/pixel/colors'
import { MOUND_Y, STORM_MS, SUN_RAYS_MS } from '../sim/constants'
import type { Weather } from '../sim/types'
import type { Light } from './light'
import { celestialPosition } from './sky'

const STORM: Color = 0x4b5263
const STORM_BELLY: Color = 0x353b4a
const RAIN: Color = 0x8fb8ff
const BOLT: Color = 0xfff27a
const RAY: Color = 0xfff1a8
const MOONBEAM: Color = 0xdfe6ff

function drawStorm(options: { bitmap: Bitmap; right: number; weather: Weather; light: Light }): void {
  const { bitmap, right, weather } = options
  const fade = Math.min(1, weather.ms / 500, (STORM_MS - weather.ms) / 800)
  const cloud = mixColors({ from: options.light.middle, to: STORM, amount: fade })
  const belly = mixColors({ from: options.light.middle, to: STORM_BELLY, amount: fade })
  for (let x = 1; x < right; x += 1) {
    const top = Math.round(1 + Math.sin(x / 2.3) * 0.8 + Math.sin(x / 5.1) * 0.6)
    fillRect({ bitmap, x, y: Math.max(0, top), width: 1, height: 4 - Math.max(0, top), color: cloud })
    setPixel({ bitmap, x, y: 4, color: belly })
  }
  if (fade < 0.6) {
    return
  }
  for (let x = 2; x < right - 1; x += 3) {
    const drop = Math.floor(weather.ms / 45 + x * 7) % 10
    const y = 5 + drop
    if (y < MOUND_Y + 2) {
      setPixel({ bitmap, x: x - Math.floor(drop / 3), y, color: RAIN })
      setPixel({ bitmap, x: x - Math.floor(drop / 3) - 1, y: y + 1, color: RAIN })
    }
  }
  const isFlash = (weather.ms > 300 && weather.ms < 420) || (weather.ms > 2900 && weather.ms < 3000)
  if (isFlash) {
    const boltX = Math.round(right * 0.55)
    ;[0, 1, 0, -1, 0, 1, 0].forEach((offset, index) => setPixel({ bitmap, x: boltX + offset, y: 5 + index, color: BOLT }))
  }
}

function drawRays(options: { bitmap: Bitmap; hour: number; weather: Weather; light: Light }): void {
  const { bitmap, light } = options
  const spot = celestialPosition({ hour: options.hour, width: bitmap.width })
  const grow = Math.min(1, options.weather.ms / 500)
  const fade = Math.max(0, Math.min(1, (SUN_RAYS_MS - options.weather.ms) / 1000))
  const beam = mixColors({ from: light.bottom, to: spot.isSun ? RAY : MOONBEAM, amount: 0.35 + fade * 0.5 })
  const reach = 4 + grow * 7
  ;[35, 65, 95, 125, 155].forEach((angle, index) => {
    const radians = toRadians(angle + Math.sin(options.weather.ms / 400 + index) * 3)
    for (let distance = 4; distance < reach; distance += 1) {
      if (fade < 0.5 && distance % 2 === 0) {
        continue
      }
      setPixel({
        bitmap,
        x: spot.x + 1.5 + Math.cos(radians) * distance,
        y: spot.y + 1.5 + Math.sin(radians) * distance,
        color: beam,
      })
    }
  })
}

export function drawWeather(options: { bitmap: Bitmap; weather: Weather; hour: number; right: number; light: Light }): void {
  if (options.weather.kind === 'storm') {
    drawStorm(options)
  }
  if (options.weather.kind === 'sunny') {
    drawRays(options)
  }
}
