import { FRAME_MS } from '../../plugins/slayer-corps/hooks/sim/constants.ts'
import { createBattle } from '../../plugins/slayer-corps/hooks/sim/battle.ts'
import { freshProgress } from '../../plugins/slayer-corps/hooks/story/progress.ts'
import { runScript } from './script.ts'
import type { Storyboard } from './script.ts'

export function storyboard(): Storyboard {
  const battle = createBattle()
  battle.restore({ ...freshProgress(), chapter: 3, demonHp: 70 })
  const bitmaps = runScript({
    frameMs: FRAME_MS,
    endMs: 9000,
    captureAtMs: [200, 1320, 2920, 3640, 4440, 5600, 6400, 6480, 8600],
    events: [
      { atMs: 0, run: () => battle.strike({ tool: 'Read', isFailure: false }) },
      { atMs: 1000, run: () => battle.strike({ tool: 'Edit', isFailure: false }) },
      { atMs: 2600, run: () => battle.strike({ tool: 'Bash', isFailure: false }) },
      { atMs: 3200, run: () => battle.strike({ tool: 'Agent', isFailure: false }) },
      { atMs: 4320, run: () => battle.strike({ tool: 'Bash', isFailure: true }) },
      { atMs: 5200, run: () => battle.summonNezuko() },
      { atMs: 6120, run: () => battle.finish() },
    ],
    tick: dtMs => battle.tick(dtMs),
    frame: () => battle.frame(),
  })
  return { bitmaps, note: `progress ${JSON.stringify(battle.progress())}` }
}
