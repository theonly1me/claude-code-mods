import {
  DEATH_MS,
  FLASH_MS,
  KNOCKBACK_PIXELS,
  MONSTER_FRONT_X,
  MONSTER_GAP,
  MONSTER_SPEED_PIXELS_PER_SECOND,
  MONSTER_WIDTH,
} from './constants'
import type { Monster, MonsterKind, StrikeOutcome } from './types'

export function createMonster(options: {
  id: number
  kind: MonsterKind
  isElite: boolean
  isAmbient: boolean
  label: string
  x: number
}): Monster {
  return {
    ...options,
    hitsRemaining: 1,
    isDoomed: false,
    phase: 'alive',
    phaseMs: 0,
    flashMs: 0,
    walkMs: options.id * 137,
  }
}

export function advanceMonsters(options: { monsters: Monster[]; dtMs: number }): Monster[] {
  const { monsters, dtMs } = options
  const alive = monsters.filter(monster => monster.phase === 'alive')
  alive
    .sort((first, second) => first.x - second.x)
    .forEach((monster, rank) => {
      const limit = MONSTER_FRONT_X + rank * (MONSTER_WIDTH + MONSTER_GAP)
      monster.x = Math.max(limit, monster.x - (MONSTER_SPEED_PIXELS_PER_SECOND * dtMs) / 1000)
      monster.walkMs += dtMs
      monster.flashMs = Math.max(0, monster.flashMs - dtMs)
    })
  monsters
    .filter(monster => monster.phase === 'dying')
    .forEach(monster => {
      monster.phaseMs += dtMs
    })
  return monsters.filter(monster => monster.phase === 'alive' || monster.phaseMs < DEATH_MS)
}

export function nearestDoomed(monsters: readonly Monster[]): Monster | undefined {
  const [nearest] = monsters
    .filter(monster => monster.phase === 'alive' && monster.isDoomed)
    .sort((first, second) => first.x - second.x)
  return nearest
}

export function applyStrike(monster: Monster): StrikeOutcome {
  monster.hitsRemaining -= 1
  monster.flashMs = FLASH_MS
  if (monster.hitsRemaining <= 0) {
    monster.phase = 'dying'
    monster.phaseMs = 0
    return 'killed'
  }
  monster.x += KNOCKBACK_PIXELS
  return 'parried'
}
