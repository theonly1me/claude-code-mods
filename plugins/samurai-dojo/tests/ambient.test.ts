import { expect, test } from 'claude-code/testing'

import { SEASON_MS, startOfSeason } from '../hooks/shared/pixel/seasons'
import { FRAME_MS } from '../hooks/sim/constants'
import { createDojo } from '../hooks/sim/dojo'
import type { Dojo } from '../hooks/sim/dojo'

function idle(options: { dojo: Dojo; ms: number }): string[] {
  const seen: string[] = []
  for (let elapsedMs = 0; elapsedMs < options.ms; elapsedMs += FRAME_MS) {
    options.dojo.tick({ dtMs: FRAME_MS })
    const [latest] = options.dojo.log()
    if (latest !== undefined && seen.at(-1) !== latest) {
      seen.push(latest)
    }
  }
  return seen
}

test('an idle dojo keeps busy with meditation, kata, duels, and enemy waves', () => {
  const dojo = createDojo({ seed: 3 })

  const lines = idle({ dojo, ms: 120000 })

  expect(lines.some(line => line.startsWith('Meditates'))).toBe(true)
  expect(lines.some(line => line.includes('ronin'))).toBe(true)
  expect(lines.some(line => line.endsWith('attack') || line.includes('captain'))).toBe(true)
  expect(lines.some(line => line.startsWith('Practices') || line.startsWith('Drills'))).toBe(true)
})

test('ambient action never counts as a kill', () => {
  const dojo = createDojo({ seed: 5 })
  dojo.restore({ tally: { codex: 1, gemini: 2, chatgpt: 3 }, lifetimeKills: 50 })

  idle({ dojo, ms: 120000 })

  expect(dojo.tally()).toEqual({ codex: 1, gemini: 2, chatgpt: 3 })
  expect(dojo.lifetimeKills()).toBe(50)
})

test('real work interrupts a duel and still lands its kill', () => {
  const dojo = createDojo({ seed: 11 })
  idle({ dojo, ms: 1500 })
  const id = dojo.spawn({ isElite: false, label: 'Edit' })
  dojo.defeat({ id, isFailure: false })

  const lines = idle({ dojo, ms: 8000 })

  expect(lines).toContain('The ronin flees: real work arrives')
  expect(lines).toContain('Edit: cut down a Codex pod')
  expect(dojo.lifetimeKills()).toBe(1)
})

test('the seasons follow the clock, five minutes each', () => {
  const dojo = createDojo()
  dojo.begin(startOfSeason({ name: 'winter' }) + SEASON_MS - 2000)
  expect(dojo.season().name).toBe('winter')

  const lines = idle({ dojo, ms: 4000 })

  expect(dojo.season().name).toBe('blossom')
  expect(lines).toContain('Cherry blossom begins')
  expect(dojo.summary()).toContain('Cherry blossom, Summer in 5m')
})
