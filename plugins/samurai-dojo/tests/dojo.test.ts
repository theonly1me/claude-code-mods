import { expect, test } from 'claude-code/testing'

import { FRAME_MS, MAX_ALIVE_MONSTERS } from '../hooks/sim/constants'
import { createDojo } from '../hooks/sim/dojo'
import type { Dojo } from '../hooks/sim/dojo'
import type { KillEvent } from '../hooks/sim/types'

const SAFETY_LIMIT_MS = 20000

function runUntilKills(options: {
  dojo: Dojo
  count: number
}): { elapsedMs: number; kills: KillEvent[] } {
  const kills: KillEvent[] = []
  let elapsedMs = 0
  while (kills.length < options.count && elapsedMs < SAFETY_LIMIT_MS) {
    kills.push(...options.dojo.tick({ dtMs: FRAME_MS }))
    elapsedMs += FRAME_MS
  }
  return { elapsedMs, kills }
}

test('a finished action kills its monster exactly once', () => {
  const dojo = createDojo()
  const id = dojo.spawn({ isElite: false })
  dojo.defeat({ id, isFailure: false })

  const { kills } = runUntilKills({ dojo, count: 1 })
  const laterKills = runUntilKills({ dojo, count: 1 }).kills

  expect(kills.length).toBe(1)
  expect(laterKills.length).toBe(0)
  expect(dojo.tally().codex + dojo.tally().gemini).toBe(1)
})

test('monsters alternate between Codex and Gemini', () => {
  const dojo = createDojo()
  const first = dojo.spawn({ isElite: false })
  const second = dojo.spawn({ isElite: false })
  dojo.defeat({ id: first, isFailure: false })
  dojo.defeat({ id: second, isFailure: false })

  runUntilKills({ dojo, count: 2 })

  expect(dojo.tally()).toEqual({ codex: 1, gemini: 1 })
})

test('a monster waits alive until its action finishes', () => {
  const dojo = createDojo()
  dojo.spawn({ isElite: false })

  const { kills } = runUntilKills({ dojo, count: 1 })

  expect(kills.length).toBe(0)
})

test('a failed action takes a parried strike before the kill', () => {
  const clean = createDojo()
  clean.defeat({ id: clean.spawn({ isElite: false }), isFailure: false })
  const failing = createDojo()
  failing.defeat({ id: failing.spawn({ isElite: false }), isFailure: true })

  const cleanRun = runUntilKills({ dojo: clean, count: 1 })
  const failingRun = runUntilKills({ dojo: failing, count: 1 })

  expect(failingRun.kills.length).toBe(1)
  expect(failingRun.elapsedMs).toBeGreaterThan(cleanRun.elapsedMs)
})

test('an elite monster takes two strikes', () => {
  const clean = createDojo()
  clean.defeat({ id: clean.spawn({ isElite: false }), isFailure: false })
  const elite = createDojo()
  elite.defeat({ id: elite.spawn({ isElite: true }), isFailure: false })

  const cleanRun = runUntilKills({ dojo: clean, count: 1 })
  const eliteRun = runUntilKills({ dojo: elite, count: 1 })

  expect(eliteRun.kills).toEqual([{ kind: 'codex', isElite: true }])
  expect(eliteRun.elapsedMs).toBeGreaterThan(cleanRun.elapsedMs)
})

test('a burst past the alive cap still counts every kill', () => {
  const dojo = createDojo()
  const burst = MAX_ALIVE_MONSTERS + 3
  const ids = Array.from({ length: burst }, () => dojo.spawn({ isElite: false }))
  ids.forEach(id => dojo.defeat({ id, isFailure: false }))

  const { kills } = runUntilKills({ dojo, count: burst })

  expect(kills.length).toBe(burst)
})

test('a frame is as wide as the stage and sixteen pixels tall', () => {
  const dojo = createDojo()
  dojo.resize(60)

  const bitmap = dojo.frame()

  expect(bitmap.width).toBe(60)
  expect(bitmap.pixels.length).toBe(60 * 16)
})
