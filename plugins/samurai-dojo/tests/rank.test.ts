import { expect, test } from 'claude-code/testing'

import { FRAME_MS } from '../hooks/sim/constants'
import { createDojo } from '../hooks/sim/dojo'
import { nextRankOf, rankOf } from '../hooks/sim/rank'

function runFor(options: { dojo: ReturnType<typeof createDojo>; milliseconds: number }): number {
  let kills = 0
  for (let elapsed = 0; elapsed < options.milliseconds; elapsed += FRAME_MS) {
    kills += options.dojo.tick({ dtMs: FRAME_MS }).length
  }
  return kills
}

test('ranks climb from Ronin to Shogun by lifetime kills', () => {
  expect(rankOf(0).title).toBe('Ronin')
  expect(rankOf(99).title).toBe('Ronin')
  expect(rankOf(100).title).toBe('Hatamoto')
  expect(rankOf(500).title).toBe('Daimyo')
  expect(rankOf(2000).title).toBe('Shogun')
  expect(nextRankOf(2000)).toBeUndefined()
  expect(nextRankOf(42)?.title).toBe('Hatamoto')
})

test('kills add to the restored lifetime count', () => {
  const dojo = createDojo()
  dojo.restore({ tally: { codex: 0, gemini: 0, chatgpt: 0 }, lifetimeKills: 99 })
  dojo.defeat({ id: dojo.spawn({ isElite: false, label: 'Read' }), isFailure: false })

  runFor({ dojo, milliseconds: 4000 })

  expect(dojo.lifetimeKills()).toBe(100)
  expect(dojo.rank().title).toBe('Hatamoto')
})

test('three quick kills make a flurry and a lone kill does not', () => {
  const lone = createDojo()
  lone.defeat({ id: lone.spawn({ isElite: false, label: 'Read' }), isFailure: false })
  runFor({ dojo: lone, milliseconds: 4000 })
  expect(lone.flurries()).toBe(0)

  const burst = createDojo()
  const ids = [1, 2, 3].map(() => burst.spawn({ isElite: false, label: 'Read' }))
  ids.forEach(id => burst.defeat({ id, isFailure: false }))
  expect(runFor({ dojo: burst, milliseconds: 6000 })).toBe(3)
  expect(burst.flurries()).toBe(1)
})
