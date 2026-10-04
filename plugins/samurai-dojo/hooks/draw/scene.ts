import type { Bitmap } from '../shared/pixel/bitmap'
import type { Rank } from '../sim/rank'
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
  rank: Rank
}): void {
  const { bitmap, rank } = options
  drawBackdrop(bitmap)
  drawKillCount({ bitmap, total: options.totalKills, iconColor: rank.bright })
  options.monsters.forEach(monster => drawMonster({ bitmap, monster }))
  drawSamurai({ bitmap, samurai: options.samurai, rank })
  options.effects.forEach(effect => drawEffect({ bitmap, effect }))
}
