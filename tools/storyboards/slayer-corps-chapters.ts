import { createBattle } from '../../plugins/slayer-corps/hooks/sim/battle.ts'
import { CHAPTERS, maxHpFor } from '../../plugins/slayer-corps/hooks/story/campaign.ts'
import { freshProgress } from '../../plugins/slayer-corps/hooks/story/progress.ts'
import type { Storyboard } from './script.ts'

export function storyboard(): Storyboard {
  const bitmaps = CHAPTERS.map((chapter, index) => {
    const battle = createBattle()
    const maxHp = maxHpFor({ chapter: index, cycle: 1 })
    const isMuzanTrue = index === CHAPTERS.length - 1
    battle.restore({ ...freshProgress(), chapter: index, demonHp: isMuzanTrue ? Math.round(maxHp * 0.4) : maxHp })
    for (let elapsed = 0; elapsed < 1600; elapsed += 40) {
      battle.tick(40)
    }
    const frame = battle.frame()
    return { ...frame, pixels: [...frame.pixels] }
  })
  return { bitmaps, note: `${CHAPTERS.length} chapters` }
}
