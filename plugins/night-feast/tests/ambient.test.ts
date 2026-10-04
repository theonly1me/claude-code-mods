import { expect, test } from 'claude-code/testing'

import { FRAME_MS, HUNGER_MS } from '../hooks/sim/constants'
import { createNight } from '../hooks/sim/night'
import type { Night } from '../hooks/sim/night'

function runFor(options: { night: Night; milliseconds: number; onTick?: () => void }): void {
  for (let elapsed = 0; elapsed < options.milliseconds; elapsed += FRAME_MS) {
    options.night.tick({ dtMs: FRAME_MS })
    options.onTick?.()
  }
}

function doingOf(night: Night): string {
  return night.summary().split(' · ').at(-1) ?? ''
}

test('an idle night keeps the vampire busy with at least four different ambient activities a minute', () => {
  const night = createNight({ seed: 3 })
  const seen = new Set<string>()
  let idleRunMs = 0
  let longestIdleMs = 0
  runFor({
    night,
    milliseconds: 60000,
    onTick: () => {
      const doing = doingOf(night)
      seen.add(doing)
      idleRunMs = doing === 'watching the street' ? idleRunMs + FRAME_MS : 0
      longestIdleMs = Math.max(longestIdleMs, idleRunMs)
    },
  })
  seen.delete('watching the street')

  expect(seen.size).toBeGreaterThanOrEqual(4)
  expect(longestIdleMs).toBeLessThanOrEqual(1200)
})

test('ambient activity never feeds, poisons, or fills the vial', () => {
  const night = createNight({ seed: 5 })
  runFor({ night, milliseconds: 60000 })

  expect(night.stats()).toMatchObject({ feeds: 0, garlic: 0, lifetimeFeeds: 0 })
  expect(night.stats().blood).toBe(50 - Math.floor(60000 / HUNGER_MS))
})

test('a finished tool call interrupts an ambient activity and still lands its feed', () => {
  const night = createNight({ seed: 9 })
  runFor({ night, milliseconds: 2000 })
  expect(doingOf(night)).not.toBe('watching the street')

  night.feed('Read')
  runFor({ night, milliseconds: 7000 })

  expect(night.stats().feeds).toBe(1)
  expect(night.log()).toContain('Fed on a villager after Read')
})

test('the log keeps the newest activity first and stays short', () => {
  const night = createNight({ seed: 2 })
  runFor({ night, milliseconds: 120000 })

  expect(night.log().length).toBe(8)
  expect(night.log()[0]).toMatch(/[A-Z]/)
})
