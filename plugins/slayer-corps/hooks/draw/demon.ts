import { demonSprite } from '../art/demons'
import { setPixel } from '../shared/pixel/bitmap'
import type { Bitmap } from '../shared/pixel/bitmap'
import { GROUND_TOP } from '../sim/constants'
import type { Chapter } from '../story/campaign'
import { scatter } from './sky'

const WHIP_DARK = 0x6a040f
const WHIP_LIGHT = 0xd00000

function drawWhips(options: { bitmap: Bitmap; x: number; y: number; clockMs: number }): void {
  for (let whip = 0; whip < 3; whip += 1) {
    for (let step = 0; step < 12; step += 1) {
      const wave = Math.sin(options.clockMs / 160 + step / 2 + whip * 2) * (1 + step / 4)
      setPixel({
        bitmap: options.bitmap,
        x: options.x + 4 - step,
        y: options.y + 7 + whip * 2 - Math.round(step / 3) + Math.round(wave),
        color: step % 3 === 0 ? WHIP_LIGHT : WHIP_DARK,
      })
    }
  }
}

function drawWeapon(options: { bitmap: Bitmap; chapter: Chapter; x: number; y: number }): void {
  const { chapter, bitmap } = options
  if (chapter.shape === 'moon') {
    for (let step = 0; step < 7; step += 1) {
      setPixel({ bitmap, x: options.x + 2 - step, y: options.y + 9 - step, color: step === 6 ? 0xffffff : chapter.look.accent })
    }
  }
  if (chapter.place === 'Upper Moon One') {
    const extraEyes = [
      { x: 5, y: 2 },
      { x: 10, y: 2 },
      { x: 6, y: 4 },
      { x: 9, y: 4 },
    ]
    for (const eye of extraEyes) {
      setPixel({ bitmap, x: options.x + eye.x, y: options.y + eye.y, color: chapter.look.eye })
    }
  }
}

export function drawDemon(options: {
  bitmap: Bitmap
  chapter: Chapter
  x: number
  clockMs: number
  isFlashing: boolean
  dissolve: number
  isTrueForm: boolean
}): void {
  const { bitmap, chapter, clockMs } = options
  const sprite = demonSprite({ shape: chapter.shape, look: chapter.look })
  const isFloating = chapter.shape === 'lantern' || chapter.shape === 'spider'
  const bob = isFloating ? Math.round(Math.sin(clockMs / 380) - 1) : 0
  const sway = isFloating ? 0 : Math.round(Math.sin(clockMs / 900))
  const x = Math.round(options.x) + sway
  const y = GROUND_TOP - sprite.height + bob
  if (options.isTrueForm && options.dissolve === 0) {
    drawWhips({ bitmap, x, y, clockMs })
  }
  sprite.pixels.forEach((color, index) => {
    if (color === null || scatter({ seed: 17, index, span: 1000 }) < options.dissolve * 1000) {
      return
    }
    setPixel({
      bitmap,
      x: x + (index % sprite.width),
      y: y + Math.floor(index / sprite.width),
      color: options.isFlashing ? 0xffffff : color,
    })
  })
  if (options.dissolve === 0) {
    drawWeapon({ bitmap, chapter, x, y })
  }
}
