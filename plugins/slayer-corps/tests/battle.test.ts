import { expect, test } from 'claude-code/testing'

import { createBattle } from '../hooks/sim/battle'
import type { Battle } from '../hooks/sim/battle'
import { FRAME_MS, MAX_HEARTS } from '../hooks/sim/constants'
import type { StoryEvent } from '../hooks/sim/types'
import { CHAPTERS, maxHpFor } from '../hooks/story/campaign'
import { freshProgress, nextChapter, progressFromStore } from '../hooks/story/progress'

function run(options: { battle: Battle; milliseconds: number }): StoryEvent[] {
  const events: StoryEvent[] = []
  for (let elapsed = 0; elapsed < options.milliseconds; elapsed += FRAME_MS) {
    options.battle.tick(FRAME_MS)
    events.push(...options.battle.takeEvents())
  }
  return events
}

test('attacks land on impact and a finished turn lands the sun dance', () => {
  const battle = createBattle()
  battle.strike({ tool: 'Read', isFailure: false })
  battle.strike({ tool: 'Edit', isFailure: false })
  battle.finish()
  run({ battle, milliseconds: 6000 })
  expect(battle.progress().demonHp).toBe(40 - 2 - 3 - 8)
  expect(battle.progress().attacks).toBe(3)
  expect(battle.log()).toContain('Tanjiro: Sun Dance hits for 8 (a finished turn).')
})

test('failures let the demon strike back, and losing every heart heals it', () => {
  const battle = createBattle()
  battle.restore({ ...freshProgress(), demonHp: 20 })
  for (let index = 0; index < MAX_HEARTS; index += 1) {
    battle.strike({ tool: 'Bash', isFailure: true })
    run({ battle, milliseconds: 900 })
  }
  expect(battle.hearts()).toBe(MAX_HEARTS)
  expect(battle.progress().demonHp).toBe(24)
})

test('a defeated demon turns to ash and the next chapter arrives', () => {
  const battle = createBattle()
  battle.restore({ ...freshProgress(), demonHp: 2 })
  battle.strike({ tool: 'Read', isFailure: false })
  const events = run({ battle, milliseconds: 5000 })
  expect(events).toEqual([{ kind: 'defeated', chapter: 0 }, { kind: 'chapter', chapter: 1 }])
  expect(battle.progress().chapter).toBe(1)
  expect(battle.progress().demonHp).toBe(maxHpFor({ chapter: 1, cycle: 1 }))
  expect(battle.log()).toContain('Chapter 2: The Lantern Market.')
})

test('beating Muzan brings dawn and a harder new night', () => {
  const last = CHAPTERS.length - 1
  const after = nextChapter({ ...freshProgress(), chapter: last, demonHp: 0 })
  expect(after.isDawn).toBe(true)
  expect(after.progress).toMatchObject({ cycle: 2, chapter: 0, dawns: 1 })
  expect(after.progress.demonHp).toBe(maxHpFor({ chapter: 0, cycle: 2 }))

  const battle = createBattle()
  battle.restore({ ...freshProgress(), chapter: last, demonHp: 1 })
  battle.strike({ tool: 'Read', isFailure: false })
  const events = run({ battle, milliseconds: 9000 })
  expect(events.map(event => event.kind)).toEqual(['defeated', 'dawn', 'chapter'])
})

test('stored progress is validated before use', () => {
  expect(progressFromStore({ cycle: 2, chapter: 3, demonHp: 50, attacks: 9, defeated: 3, dawns: 1 }).chapter).toBe(3)
  expect(progressFromStore({ chapter: 99, demonHp: -4 })).toMatchObject({ chapter: CHAPTERS.length - 1, cycle: 1 })
  expect(progressFromStore('nonsense')).toEqual(freshProgress())
})

test('a frame fills the stage at every width the pane allows', () => {
  const battle = createBattle()
  battle.resize(56)
  expect(battle.frame().width).toBe(56)
  expect(battle.frame().height).toBe(16)
})

test('an idle battle shows all four slayers sparring within 30 seconds', () => {
  const battle = createBattle()
  const movers = new Set<string>()
  let longestStillMs = 0
  let stillMs = 0
  for (let elapsed = 0; elapsed < 30000; elapsed += FRAME_MS) {
    battle.tick(FRAME_MS)
    const busy = battle.actors().filter(actor => actor.mode !== 'home' && actor.mode !== 'offstage')
    busy.forEach(actor => movers.add(actor.name))
    stillMs = busy.length === 0 ? stillMs + FRAME_MS : 0
    longestStillMs = Math.max(longestStillMs, stillMs)
  }
  expect([...movers].sort()).toEqual(['inosuke', 'nezuko', 'tanjiro', 'zenitsu'])
  expect(longestStillMs).toBeLessThan(1000)
})

test('sparring never changes the demon or the chapter', () => {
  const battle = createBattle()
  const before = battle.progress()
  const events = run({ battle, milliseconds: 60000 })
  expect(events).toEqual([])
  expect(battle.progress()).toEqual(before)
  expect(battle.log().some(line => line.endsWith('blocks.'))).toBe(true)
})

test('work interrupts sparring and still lands', () => {
  const battle = createBattle()
  run({ battle, milliseconds: 700 })
  expect(battle.actors().some(actor => actor.mode !== 'home' && actor.mode !== 'offstage')).toBe(true)
  battle.strike({ tool: 'Bash', isFailure: false })
  run({ battle, milliseconds: 1200 })
  expect(battle.progress().demonHp).toBe(37)
})
