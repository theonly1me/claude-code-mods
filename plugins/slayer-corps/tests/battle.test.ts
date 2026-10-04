import { expect, test } from 'claude-code/testing'

import { createBattle } from '../hooks/sim/battle'
import type { Battle } from '../hooks/sim/battle'
import { FRAME_MS, MAX_HEARTS } from '../hooks/sim/constants'
import { attackFor } from '../hooks/sim/moves'
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

test('each tool picks its slayer and form', () => {
  expect(attackFor('Read')).toEqual({ attacker: 'tanjiro', kind: 'water', damage: 2 })
  expect(attackFor('Edit').attacker).toBe('inosuke')
  expect(attackFor('Bash').kind).toBe('thunder')
  expect(attackFor('Agent').attacker).toBe('hashira')
  expect(attackFor('mcp__github__list').damage).toBe(1)
})

test('attacks land on impact and a finished turn lands the sun dance', () => {
  const battle = createBattle()
  battle.strike({ tool: 'Read', isFailure: false })
  battle.strike({ tool: 'Edit', isFailure: false })
  battle.finish()
  run({ battle, milliseconds: 6000 })
  expect(battle.progress().demonHp).toBe(40 - 2 - 3 - 8)
  expect(battle.progress().attacks).toBe(3)
})

test('failures let the demon strike back, and losing every heart heals it', () => {
  const battle = createBattle()
  battle.restore({ ...freshProgress(), demonHp: 20 })
  for (let index = 0; index < MAX_HEARTS; index += 1) {
    battle.strike({ tool: 'Bash', isFailure: true })
    run({ battle, milliseconds: 600 })
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

test('a frame fills the stage at every width the band allows', () => {
  const battle = createBattle()
  battle.resize(56)
  expect(battle.frame().width).toBe(56)
  expect(battle.frame().height).toBe(16)
})
