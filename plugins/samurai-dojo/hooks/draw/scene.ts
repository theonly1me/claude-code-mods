import type { Bitmap } from '../render/bitmap'
import type { Effect, Monster, Samurai } from '../sim/types'
import { drawBackdrop } from './backdrop'
import { drawEffect } from './effects'
import { drawKillCount } from './hud'
import { drawMonster } from './monsters'
import { drawSamurai } from './samurai'

export function drawScene(options: {
  bitmap: Bitmap
  monsters: readonly Monster[]
  effects: readonly Effect[]
  samurai: Samurai
  totalKills: number
}): void {
  const { bitmap } = options
  drawBackdrop(bitmap)
  drawKillCount({ bitmap, total: options.totalKills })
  options.monsters.forEach(monster => drawMonster({ bitmap, monster }))
  drawSamurai({ bitmap, samurai: options.samurai })
  options.effects.forEach(effect => drawEffect({ bitmap, effect }))
}
