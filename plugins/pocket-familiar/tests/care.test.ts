import { expect, test } from 'claude-code/testing'

import { isCreatedFile, toolKindOf } from '../hooks/activity'
import { FRAME_MS, HOUR_MS, IDLE_SLEEP_MS } from '../hooks/sim/constants'
import { createFamiliar } from '../hooks/sim/familiar'
import type { Familiar } from '../hooks/sim/familiar'
import { growthOf } from '../hooks/sim/growth'
import { afterAway } from '../hooks/sim/stats'

function familiarWith(options: { lifetimeXp: number }): Familiar {
  const familiar = createFamiliar()
  familiar.restore({ saved: { fullness: 50, joy: 50, energy: 50, lifetimeXp: options.lifetimeXp, lastSeenAt: 0 }, now: 0 })
  return familiar
}

function idleFor(options: { familiar: Familiar; milliseconds: number }): void {
  for (let elapsed = 0; elapsed < options.milliseconds; elapsed += FRAME_MS * 25) {
    options.familiar.tick({ dtMs: FRAME_MS * 25 })
  }
}

test('stats decay while you are away and energy recovers', () => {
  const stats = afterAway({ saved: { fullness: 70, joy: 70, energy: 40, lifetimeXp: 0, lastSeenAt: 0 }, now: 10 * HOUR_MS })
  expect(Math.round(stats.fullness)).toBe(30)
  expect(Math.round(stats.joy)).toBe(50)
  expect(stats.energy).toBe(100)
  expect(afterAway({ saved: { fullness: 5, joy: 5, energy: 5, lifetimeXp: 0, lastSeenAt: 0 }, now: 99 * HOUR_MS }).fullness).toBe(0)
})

test('a passing test feeds the familiar, shows a heart, and gives five XP', () => {
  const familiar = familiarWith({ lifetimeXp: 200 })
  familiar.toolStarted('test')
  expect(familiar.view().activity).toBe('test')
  familiar.toolFinished({ kind: 'test', isFailure: false, isCreation: false })
  expect(Math.round(familiar.view().stats.fullness)).toBe(62)
  expect(familiar.view().bubble?.glyph).toBe('heart')
  expect(familiar.view().lifetimeXp).toBe(205)
  expect(familiar.view().activity).toBe('idle')
})

test('five quiet minutes make it sleep, and work wakes it', () => {
  const familiar = familiarWith({ lifetimeXp: 200 })
  idleFor({ familiar, milliseconds: IDLE_SLEEP_MS - 2000 })
  expect(familiar.view().isSleeping).toBe(false)
  idleFor({ familiar, milliseconds: 3000 })
  expect(familiar.mood()).toBe('asleep')
  familiar.userActive()
  expect(familiar.view().isSleeping).toBe(false)
})

test('a running turn keeps it awake and shows thought dots', () => {
  const familiar = familiarWith({ lifetimeXp: 200 })
  familiar.turnStarted()
  idleFor({ familiar, milliseconds: IDLE_SLEEP_MS + 1000 })
  expect(familiar.view().isSleeping).toBe(false)
  expect(familiar.view().activity).toBe('thinking')
})

test('three failures in a row bring the rubber duck until the next success', () => {
  const familiar = familiarWith({ lifetimeXp: 200 })
  const fail = (): void => {
    familiar.toolStarted('other')
    familiar.toolFinished({ kind: 'other', isFailure: true, isCreation: false })
  }
  fail()
  fail()
  expect(familiar.view().hasDuck).toBe(false)
  expect(familiar.mood()).toBe('worried')
  fail()
  expect(familiar.view().hasDuck).toBe(true)
  expect(familiar.mood()).toBe('needs a break')
  familiar.toolStarted('read')
  familiar.toolFinished({ kind: 'read', isFailure: false, isCreation: false })
  expect(familiar.view().hasDuck).toBe(false)
})

test('XP grows the egg into a kit, a fox, and finally nine tails', () => {
  expect(growthOf(0).form).toBe('egg')
  expect(growthOf(20).form).toBe('kit')
  expect(growthOf(120)).toEqual({ form: 'fox', tails: 1, title: 'fox spirit', minimumXp: 120 })
  expect(growthOf(5500).tails).toBe(9)
  const familiar = familiarWith({ lifetimeXp: 18 })
  familiar.turnStarted()
  familiar.turnCompleted({ isSuccess: true })
  expect(familiar.takeEvolutions().map(growth => growth.form)).toEqual(['kit'])
  expect(familiar.takeEvolutions()).toEqual([])
})

test('tools map to what the familiar mirrors, and frames fill the stage', () => {
  expect(toolKindOf({ tool: 'Read', command: '' })).toBe('read')
  expect(toolKindOf({ tool: 'Write', command: '' })).toBe('edit')
  expect(toolKindOf({ tool: 'Bash', command: 'npm test' })).toBe('test')
  expect(toolKindOf({ tool: 'Bash', command: 'ls' })).toBe('other')
  expect(isCreatedFile({ type: 'create' })).toBe(true)
  expect(isCreatedFile({ type: 'update' })).toBe(false)
  const bitmap = familiarWith({ lifetimeXp: 6000 }).frame()
  expect(bitmap.width).toBe(72)
  expect(bitmap.height).toBe(16)
})
