import {
  CASTLE_WIDTH,
  DIZZY_SPEED_PIXELS_PER_SECOND,
  FEED_MS,
  VILLAGE_LEFT,
  VILLAGER_SPEED_PIXELS_PER_SECOND,
} from './constants'
import type { Palette, Villager } from './types'

const VILLAGER_WIDTH = 5
const PALETTES: readonly Palette[] = [0, 1, 2]

export function createVillager(options: { id: number; width: number }): Villager {
  return {
    id: options.id,
    x: options.width + 1,
    direction: -1,
    palette: PALETTES[options.id % PALETTES.length] ?? 0,
    state: 'walking',
    stateMs: 0,
    walkMs: options.id * 113,
  }
}

function walk(options: { villager: Villager; dtMs: number; width: number }): void {
  const { villager, dtMs } = options
  const rightBound = options.width - CASTLE_WIDTH - VILLAGER_WIDTH - 2
  villager.x += (villager.direction * VILLAGER_SPEED_PIXELS_PER_SECOND * dtMs) / 1000
  if (villager.x <= VILLAGE_LEFT) {
    villager.direction = 1
  } else if (villager.x >= rightBound && villager.direction === 1) {
    villager.direction = -1
  }
}

export function advanceVillagers(options: { villagers: Villager[]; dtMs: number; width: number }): Villager[] {
  const { dtMs, width } = options
  options.villagers.forEach(villager => {
    villager.stateMs += dtMs
    villager.walkMs += dtMs
    if (villager.state === 'walking') {
      walk({ villager, dtMs, width })
    } else if (villager.state === 'bitten' && villager.stateMs >= FEED_MS) {
      villager.state = 'dizzy'
      villager.stateMs = 0
    } else if (villager.state === 'dizzy') {
      villager.x += (villager.direction * DIZZY_SPEED_PIXELS_PER_SECOND * dtMs) / 1000
    }
  })
  return options.villagers.filter(villager => villager.x > -VILLAGER_WIDTH - 2 && villager.x < width + 4)
}

export function biteVillager(options: { villager: Villager; fromX: number }): void {
  options.villager.state = 'bitten'
  options.villager.stateMs = 0
  options.villager.direction = options.fromX < options.villager.x ? 1 : -1
}

export function nearestWalking(options: { villagers: readonly Villager[]; x: number }): Villager | undefined {
  return options.villagers
    .filter(villager => villager.state === 'walking')
    .reduce<Villager | undefined>(
      (best, villager) => (!best || Math.abs(villager.x - options.x) < Math.abs(best.x - options.x) ? villager : best),
      undefined,
    )
}
