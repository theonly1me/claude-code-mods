import { fillRect, setPixel } from '../shared/pixel/bitmap'
import type { Bitmap } from '../shared/pixel/bitmap'
import { DEMON_RIGHT_MARGIN, DEMON_WIDTH, GROUND_TOP, MAX_HEARTS } from '../sim/constants'
import type { Particle } from '../sim/types'

const STRIP_Y = GROUND_TOP + 1
const PIP_ON = 0xe63946
const PIP_LIGHT = 0xff8fa3
const PIP_OFF = 0x2b2d35
const FRAME = 0x0b0b0b

export function drawHud(options: { bitmap: Bitmap; cycle: number; hearts: number; hp: number; shownHp: number; maxHp: number }): void {
  const { bitmap } = options
  fillRect({ bitmap, x: 1, y: STRIP_Y, width: MAX_HEARTS * 3 + 1, height: 2, color: FRAME })
  for (let index = 0; index < MAX_HEARTS; index += 1) {
    const isOn = index < options.hearts
    fillRect({ bitmap, x: 2 + index * 3, y: STRIP_Y, width: 2, height: 2, color: isOn ? PIP_ON : PIP_OFF })
    if (isOn) {
      setPixel({ bitmap, x: 2 + index * 3, y: STRIP_Y, color: PIP_LIGHT })
    }
  }
  if (options.cycle > 1) {
    fillRect({ bitmap, x: MAX_HEARTS * 3 + 3, y: STRIP_Y, width: 2, height: 2, color: 0xffd166 })
  }
  const barWidth = DEMON_WIDTH
  const barX = bitmap.width - DEMON_WIDTH - DEMON_RIGHT_MARGIN
  const filled = Math.round((options.hp / options.maxHp) * barWidth)
  const trailing = Math.round((options.shownHp / options.maxHp) * barWidth)
  fillRect({ bitmap, x: barX - 1, y: STRIP_Y, width: barWidth + 2, height: 2, color: FRAME })
  fillRect({ bitmap, x: barX, y: STRIP_Y, width: trailing, height: 2, color: 0xffd166 })
  fillRect({ bitmap, x: barX, y: STRIP_Y, width: filled, height: 2, color: 0xc1121f })
  fillRect({ bitmap, x: barX, y: STRIP_Y, width: filled, height: 1, color: 0xff4d6d })
}

export function drawParticles(options: { bitmap: Bitmap; particles: readonly Particle[] }): void {
  options.particles.forEach(particle => {
    if (particle.ageMs < 0) {
      return
    }
    setPixel({ bitmap: options.bitmap, x: particle.x, y: particle.y, color: particle.color })
    if (particle.kind === 'blade' || particle.kind === 'water') {
      setPixel({ bitmap: options.bitmap, x: particle.x - Math.sign(particle.velocityX), y: particle.y, color: particle.color })
    }
  })
}
