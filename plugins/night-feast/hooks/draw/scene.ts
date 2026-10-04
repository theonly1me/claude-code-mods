import type { Bitmap } from '../shared/pixel/bitmap'
import { WARM_PERCENT } from '../sim/constants'
import { dawnAmount } from '../sim/sky'
import type { Effect, Vampire, Villager } from '../sim/types'
import { drawVampire, drawVillager } from './actors'
import { drawBackdrop } from './backdrop'
import { drawEffect } from './effects'
import { drawHud } from './hud'

export function drawScene(options: {
  bitmap: Bitmap
  percent: number | null
  blood: number
  vampire: Vampire
  villagers: readonly Villager[]
  effects: readonly Effect[]
}): void {
  const { bitmap, percent, vampire } = options
  const clockMs = vampire.clockMs
  drawBackdrop({ bitmap, percent, dawn: dawnAmount(percent), clockMs })
  options.villagers.forEach(villager => drawVillager({ bitmap, villager }))
  drawVampire({ bitmap, vampire, isNervous: (percent ?? 0) >= WARM_PERCENT })
  options.effects.forEach(effect => drawEffect({ bitmap, effect }))
  drawHud({ bitmap, blood: options.blood, percent, clockMs })
}
