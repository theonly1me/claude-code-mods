import { expect, test } from 'claude-code/testing'

import { FOX_X, FRAME_MS } from '../hooks/sim/constants'
import { createFamiliar } from '../hooks/sim/familiar'
import type { Familiar } from '../hooks/sim/familiar'

const MINUTE_MS = 60 * 1000

function awakeFox(options: { lifetimeXp: number }): Familiar {
  const familiar = createFamiliar()
  familiar.restore({ saved: { fullness: 50, joy: 50, energy: 50, lifetimeXp: options.lifetimeXp, lastSeenAt: 0 }, now: 0 })
  familiar.begin(42)
  return familiar
}

function rounded(value: number): number {
  return Math.round(value * 100) / 100
}

test('an idle, awake fox plays at least four different games in a minute with no long pauses', () => {
  const familiar = awakeFox({ lifetimeXp: 200 })
  const kinds = new Set<string>()
  let lookMs = 0
  let longestLookMs = 0
  for (let elapsed = 0; elapsed < MINUTE_MS; elapsed += FRAME_MS) {
    familiar.tick({ dtMs: FRAME_MS })
    const { kind } = familiar.view().ambient
    lookMs = kind === 'look' ? lookMs + FRAME_MS : 0
    longestLookMs = Math.max(longestLookMs, lookMs)
    if (kind !== 'look') {
      kinds.add(kind)
    }
  }
  expect(kinds.size).toBeGreaterThanOrEqual(4)
  expect(longestLookMs).toBeLessThanOrEqual(1000)
  expect(familiar.log().length).toBeGreaterThanOrEqual(4)
})

test('play never changes stats or XP', () => {
  const familiar = awakeFox({ lifetimeXp: 200 })
  for (let elapsed = 0; elapsed < MINUTE_MS; elapsed += FRAME_MS) {
    familiar.tick({ dtMs: FRAME_MS })
  }
  const { stats, lifetimeXp } = familiar.view()
  expect(lifetimeXp).toBe(200)
  expect(rounded(stats.fullness)).toBe(49.9)
  expect(rounded(stats.joy)).toBe(49.93)
  expect(rounded(stats.energy)).toBe(49.8)
  expect(familiar.view().ambient.count).toBeGreaterThan(0)
})

test('work interrupts play and the fox walks home to help', () => {
  const familiar = awakeFox({ lifetimeXp: 200 })
  familiar.play('butterfly')
  for (let elapsed = 0; elapsed < 2000; elapsed += FRAME_MS) {
    familiar.tick({ dtMs: FRAME_MS })
  }
  expect(familiar.view().ambient.foxX).toBeGreaterThan(FOX_X)
  familiar.toolStarted('edit')
  for (let elapsed = 0; elapsed < 2000; elapsed += FRAME_MS) {
    familiar.tick({ dtMs: FRAME_MS })
  }
  expect(familiar.view().ambient.kind).toBe('look')
  expect(familiar.view().ambient.foxX).toBe(FOX_X)
  expect(familiar.summary()).toContain('typing with Claude')
})

test('the scene changes on every frame while the fox plays, and the egg never plays', () => {
  const familiar = awakeFox({ lifetimeXp: 200 })
  let previous = familiar.frame().pixels.join()
  for (let step = 0; step < 120; step += 1) {
    for (let elapsed = 0; elapsed < 240; elapsed += FRAME_MS) {
      familiar.tick({ dtMs: FRAME_MS })
    }
    const current = familiar.frame().pixels.join()
    expect(current === previous).toBe(false)
    previous = current
  }
  const egg = awakeFox({ lifetimeXp: 0 })
  for (let elapsed = 0; elapsed < 20000; elapsed += FRAME_MS) {
    egg.tick({ dtMs: FRAME_MS })
  }
  expect(egg.view().ambient.count).toBe(0)
  expect(egg.summary()).toContain('waiting to hatch')
})
