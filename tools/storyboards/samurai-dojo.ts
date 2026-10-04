import { FRAME_MS } from '../../plugins/samurai-dojo/hooks/sim/constants.ts'
import { createDojo } from '../../plugins/samurai-dojo/hooks/sim/dojo.ts'
import { runScript } from './script.ts'
import type { Storyboard } from './script.ts'

export function storyboard(): Storyboard {
  const dojo = createDojo()
  dojo.restore({ tally: { codex: 0, gemini: 0 }, lifetimeKills: 520 })
  const ids: number[] = []
  const bitmaps = runScript({
    frameMs: FRAME_MS,
    endMs: 7200,
    captureAtMs: [400, 2480, 3200, 3920, 4000, 4080, 4160, 4400, 6400],
    events: [
      { atMs: 0, run: () => ids.push(dojo.spawn({ isElite: false })) },
      { atMs: 200, run: () => ids.push(dojo.spawn({ isElite: false })) },
      { atMs: 400, run: () => ids.push(dojo.spawn({ isElite: true })) },
      { atMs: 2200, run: () => ids.forEach((id, index) => dojo.defeat({ id, isFailure: false })) },
      { atMs: 6000, run: () => dojo.celebrate() },
    ],
    tick: dtMs => dojo.tick({ dtMs }),
    frame: () => dojo.frame(),
  })
  return {
    bitmaps,
    note: `kills ${JSON.stringify(dojo.tally())}, rank ${dojo.rank().title}, flurries ${dojo.flurries()}`,
  }
}
