import {
  CASTLE_WIDTH,
  DIZZY_SPEED_PIXELS_PER_SECOND,
  FEED_MS,
  FLEE_SPEED_PIXELS_PER_SECOND,
  HOUSES,
  VILLAGE_LEFT,
  VILLAGER_SPEED_PIXELS_PER_SECOND,
} from './constants'
import type { Palette, Villager } from './types'

const VILLAGER_WIDTH = 5
const PALETTES: readonly Palette[] = [0, 1, 2]
const DOOR_LEAD = 12

export function createVillager(options: { id: number; width: number; palette?: Palette; isFromLeft?: boolean }): Villager {
  return {
    id: options.id,
    x: options.isFromLeft ? -VILLAGER_WIDTH : options.width + 1,
    direction: options.isFromLeft ? 1 : -1,
    palette: options.palette ?? PALETTES[options.id % PALETTES.length] ?? 0,
    state: 'walking',
    stateMs: 0,
    walkMs: options.id * 113,
    doorX: 0,
  }
}

export function doorsFor(width: number): number[] {
  const limit = width - CASTLE_WIDTH - 4
  return HOUSES.filter(house => VILLAGE_LEFT + house.offset + house.width <= limit).map(
    house => VILLAGE_LEFT + house.offset + house.door,
  )
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

function run(options: { villager: Villager; dtMs: number }): void {
  const { villager, dtMs } = options
  const center = villager.x + 2
  const travel = (FLEE_SPEED_PIXELS_PER_SECOND * dtMs) / 1000
  const distance = villager.doorX - center
  villager.direction = distance >= 0 ? 1 : -1
  villager.x += Math.sign(distance) * Math.min(Math.abs(distance), travel)
  if (Math.abs(villager.doorX - (villager.x + 2)) < 0.5) {
    villager.state = 'inside'
    villager.stateMs = 0
  }
}

export function advanceVillagers(options: { villagers: Villager[]; dtMs: number; width: number }): {
  villagers: Villager[]
  enteredDoors: number[]
} {
  const { dtMs, width } = options
  options.villagers.forEach(villager => {
    villager.stateMs += dtMs
    villager.walkMs += dtMs
    if (villager.state === 'walking') {
      walk({ villager, dtMs, width })
    } else if (villager.state === 'fleeing') {
      run({ villager, dtMs })
    } else if (villager.state === 'bitten' && villager.stateMs >= FEED_MS) {
      villager.state = 'dizzy'
      villager.stateMs = 0
    } else if (villager.state === 'dizzy') {
      villager.x += (villager.direction * DIZZY_SPEED_PIXELS_PER_SECOND * dtMs) / 1000
    }
  })
  const enteredDoors = options.villagers.filter(villager => villager.state === 'inside').map(villager => villager.doorX)
  return {
    villagers: options.villagers.filter(
      villager => villager.state !== 'inside' && villager.x > -VILLAGER_WIDTH - 2 && villager.x < width + 4,
    ),
    enteredDoors,
  }
}

export function biteVillager(options: { villager: Villager; fromX: number }): void {
  options.villager.state = 'bitten'
  options.villager.stateMs = 0
  options.villager.direction = options.fromX < options.villager.x ? 1 : -1
}

export function startFleeing(options: { villager: Villager; width: number; fromX: number }): void {
  const center = options.villager.x + 2
  const away = center >= options.fromX ? 1 : -1
  const ahead = doorsFor(options.width).filter(door => (door - center) * away >= DOOR_LEAD)
  const nearest = ahead.reduce<number | undefined>(
    (best, door) => (best === undefined || Math.abs(door - center) < Math.abs(best - center) ? door : best),
    undefined,
  )
  options.villager.state = 'fleeing'
  options.villager.stateMs = 0
  options.villager.doorX = nearest ?? (away === 1 ? options.width + VILLAGER_WIDTH + 8 : -VILLAGER_WIDTH - 8)
}

export function nearestWalking(options: { villagers: readonly Villager[]; x: number }): Villager | undefined {
  return options.villagers
    .filter(villager => villager.state === 'walking')
    .reduce<Villager | undefined>(
      (best, villager) => (!best || Math.abs(villager.x - options.x) < Math.abs(best.x - options.x) ? villager : best),
      undefined,
    )
}
