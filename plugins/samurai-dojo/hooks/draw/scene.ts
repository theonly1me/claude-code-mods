import type { Bitmap } from '../shared/pixel/bitmap'
import type { Season } from '../shared/pixel/seasons'
import { drawSeasonTree } from '../shared/pixel/tree'
import type { Weather } from '../shared/pixel/weather'
import { FLOOR_TOP } from '../sim/constants'
import type { Rank } from '../sim/rank'
import type { Duel, Effect, Monster, Samurai } from '../sim/types'
import { drawBackdrop } from './backdrop'
import { drawEffect } from './effects'
import { drawKillCount } from './hud'
import { drawMonster } from './monsters'
import { drawRival } from './rival'
import { drawSamurai } from './samurai'

export function treeCenterOf(width: number): number {
  return Math.max(24, width - 22)
}

export function drawScene(options: {
  bitmap: Bitmap
  monsters: readonly Monster[]
  effects: readonly Effect[]
  samurai: Samurai
  duel: Duel | undefined
  totalKills: number
  rank: Rank
  season: Season
  weather: Weather
}): void {
  const { bitmap, rank, season, samurai, duel } = options
  drawBackdrop({ bitmap, season })
  drawSeasonTree({
    bitmap,
    centerX: treeCenterOf(bitmap.width),
    groundY: FLOOR_TOP,
    season,
    clockMs: samurai.clockMs,
  })
  drawKillCount({ bitmap, total: options.totalKills, iconColor: rank.bright })
  options.monsters.forEach(monster => drawMonster({ bitmap, monster }))
  if (duel) {
    drawRival({ bitmap, duel, clockMs: samurai.clockMs })
  }
  drawSamurai({ bitmap, samurai, rank, duel })
  options.weather.draw(bitmap)
  options.effects.forEach(effect => drawEffect({ bitmap, effect }))
}
