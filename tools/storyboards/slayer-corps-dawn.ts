import { FRAME_MS } from '../../plugins/slayer-corps/hooks/sim/constants.ts'
import { createBattle } from '../../plugins/slayer-corps/hooks/sim/battle.ts'
import { CHAPTERS } from '../../plugins/slayer-corps/hooks/story/campaign.ts'
import { freshProgress } from '../../plugins/slayer-corps/hooks/story/progress.ts'
import { runScript } from './script.ts'
import type { Storyboard } from './script.ts'

export function storyboard(): Storyboard {
  const battle = createBattle()
  battle.restore({ ...freshProgress(), chapter: CHAPTERS.length - 1, demonHp: 4 })
  const bitmaps = runScript({
    frameMs: FRAME_MS,
    endMs: 10000,
    captureAtMs: [200, 600, 1000, 1400, 2400, 3600, 5200, 7400, 8600],
    events: [{ atMs: 0, run: () => battle.finish() }],
    tick: dtMs => battle.tick(dtMs),
    frame: () => battle.frame(),
  })
  return { bitmaps, note: `phase ${battle.phase()} progress ${JSON.stringify(battle.progress())}` }
}
