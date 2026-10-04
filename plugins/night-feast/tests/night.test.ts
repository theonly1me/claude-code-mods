import { expect, test } from 'claude-code/testing'

import { FEED_BLOOD, FRAME_MS, GARLIC_BLOOD, MAX_QUEUED_FEEDS, STAGE_HEIGHT } from '../hooks/sim/constants'
import { createNight } from '../hooks/sim/night'
import type { Night } from '../hooks/sim/night'

function runFor(options: { night: Night; milliseconds: number }): number {
  let finished = 0
  for (let elapsed = 0; elapsed < options.milliseconds; elapsed += FRAME_MS) {
    finished += options.night.tick({ dtMs: FRAME_MS })
  }
  return finished
}

test('a finished tool call becomes one feed that fills the blood vial', () => {
  const night = createNight()
  const before = night.stats().blood
  night.feed()

  expect(runFor({ night, milliseconds: 6000 })).toBe(1)
  expect(night.stats().feeds).toBe(1)
  expect(night.stats().lifetimeFeeds).toBe(1)
  expect(night.stats().blood).toBe(before + FEED_BLOOD)
  expect(runFor({ night, milliseconds: 3000 })).toBe(0)
})

test('garlic costs blood and counts a hit', () => {
  const night = createNight()
  const before = night.stats().blood
  night.garlic()

  expect(night.stats().blood).toBe(before - GARLIC_BLOOD)
  expect(night.stats().garlic).toBe(1)
})

test('a burst of tool calls never loses a feed', () => {
  const night = createNight()
  const burst = MAX_QUEUED_FEEDS + 3
  for (let call = 0; call < burst; call += 1) {
    night.feed()
  }
  expect(night.stats().feeds).toBe(3)

  runFor({ night, milliseconds: 40000 })
  expect(night.stats().feeds).toBe(burst)
})

test('restored totals carry over and frames fill the stage', () => {
  const night = createNight()
  night.restore({ lifetimeFeeds: 40, feeds: 2, garlic: 1, night: 3 })
  night.resize(60)
  const bitmap = night.frame()

  expect(night.stats()).toMatchObject({ lifetimeFeeds: 40, feeds: 2, garlic: 1, night: 3 })
  expect(bitmap.width).toBe(60)
  expect(bitmap.height).toBe(STAGE_HEIGHT)
  expect(bitmap.pixels.every(pixel => pixel !== null)).toBe(true)
})
