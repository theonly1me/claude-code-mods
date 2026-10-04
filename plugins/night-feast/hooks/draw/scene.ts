import type { Bitmap } from '../shared/pixel/bitmap'
import { WARM_PERCENT } from '../sim/constants'
import { dawnAmount } from '../sim/sky'
import type { Effect, Scenery, Vampire, Villager } from '../sim/types'
import { drawCat, drawOwlTree, drawSkyLife } from './ambient'
import { drawHeavens, drawTown } from './backdrop'
import { drawEffect } from './effects'
import { drawHud } from './hud'
import { drawVampire } from './vampire'
import { drawVillager } from './villager'

export function drawScene(options: {
  bitmap: Bitmap
  percent: number | null
  blood: number
  vampire: Vampire
  villagers: readonly Villager[]
  effects: readonly Effect[]
  scenery: Scenery
}): void {
  const { bitmap, percent, vampire, scenery } = options
  const clockMs = scenery.clockMs
  drawHeavens({ bitmap, percent, dawn: dawnAmount(percent), clockMs })
  drawSkyLife({ bitmap, scenery, percent })
  drawTown({ bitmap, clockMs })
  drawOwlTree({ bitmap, scenery })
  drawCat({ bitmap, scenery })
  options.villagers.forEach(villager => drawVillager({ bitmap, villager }))
  drawVampire({ bitmap, vampire, isNervous: (percent ?? 0) >= WARM_PERCENT })
  options.effects.forEach(effect => drawEffect({ bitmap, effect }))
  drawHud({ bitmap, blood: options.blood, percent, clockMs })
}
