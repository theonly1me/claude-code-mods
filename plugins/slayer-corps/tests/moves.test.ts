import { expect, test } from 'claude-code/testing'

import { createBattle } from '../hooks/sim/battle'
import { FRAME_MS } from '../hooks/sim/constants'
import { createDirector } from '../hooks/sim/director'
import { damageFor, pickAttacker, rememberAttacker, workAttack } from '../hooks/sim/moves'
import type { CorpsMember } from '../hooks/sim/moves'

function attackersFor(tools: readonly string[]): CorpsMember[] {
  let recent: CorpsMember[] = []
  return tools.map(tool => {
    const attacker = pickAttacker({ tool, recent })
    recent = rememberAttacker({ recent, attacker })
    return attacker
  })
}

test('work strikes rotate through all four slayers', () => {
  const reads = attackersFor(Array.from({ length: 8 }, () => 'Read'))
  expect(reads).toEqual(['tanjiro', 'zenitsu', 'inosuke', 'nezuko', 'tanjiro', 'zenitsu', 'inosuke', 'nezuko'])
})

test('the tool picks its favourite slayer when that slayer is rested', () => {
  expect(attackersFor(['Read', 'Edit', 'Bash'])).toEqual(['tanjiro', 'inosuke', 'zenitsu'])
  expect(attackersFor(['mcp__github__list', 'mcp__github__list'])).toEqual(['tanjiro', 'zenitsu'])
})

test('each strike uses the slayer form and the tool damage', () => {
  expect(workAttack({ tool: 'Read', recent: [] })).toEqual({ attacker: 'tanjiro', kind: 'water', damage: 2, style: 'hit', source: 'Read' })
  expect(workAttack({ tool: 'Read', recent: ['tanjiro'] })).toMatchObject({ attacker: 'zenitsu', kind: 'thunder', damage: 2 })
  expect(workAttack({ tool: 'Agent', recent: [] })).toMatchObject({ attacker: 'hashira', kind: 'blaze', damage: 6 })
  expect(damageFor('mcp__github__list')).toBe(1)
})

test('the director cycles every slayer through several moves', () => {
  const director = createDirector()
  const plans = Array.from({ length: 16 }, () => director.plan())
  expect(new Set(plans.map(plan => plan.attacker)).size).toBe(4)
  expect(new Set(plans.map(plan => plan.style))).toEqual(new Set(['form', 'clash', 'feint', 'dodge', 'doze']))
  expect(plans.every(plan => plan.damage === 0)).toBe(true)
})

test('a battle sends real strikes to a different slayer each time', () => {
  const battle = createBattle()
  const strikers: string[] = []
  for (let index = 0; index < 4; index += 1) {
    battle.strike({ tool: 'Read', isFailure: false })
    for (let elapsed = 0; elapsed < 1500; elapsed += FRAME_MS) {
      battle.tick(FRAME_MS)
    }
    strikers.push(battle.log().find(line => line.includes('hits for')) ?? '')
  }
  expect(strikers.map(line => line.split(':')[0])).toEqual(['Tanjiro', 'Zenitsu', 'Inosuke', 'Nezuko'])
})
