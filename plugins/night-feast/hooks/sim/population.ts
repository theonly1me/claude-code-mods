import { MAX_VILLAGERS, MIN_VILLAGERS } from './constants'
import type { Palette, Villager } from './types'
import { advanceVillagers, biteVillager, createVillager, nearestWalking, startFleeing } from './villagers'

const SPAWN_COOLDOWN_MS = 1500
const LANTERN: Palette = 2

export function createPopulation() {
  let villagers: Villager[] = []
  let nextId = 1
  let cooldownMs = 0

  function spawn(options: { width: number; palette?: Palette; isFromLeft?: boolean }): number | undefined {
    if (villagers.length >= MAX_VILLAGERS) {
      return undefined
    }
    const id = nextId
    nextId += 1
    villagers.push(createVillager({ id, width: options.width, palette: options.palette, isFromLeft: options.isFromLeft }))
    return id
  }

  return {
    villagers(): readonly Villager[] {
      return villagers
    },

    find(id: number | undefined): Villager | undefined {
      return id === undefined ? undefined : villagers.find(villager => villager.id === id)
    },

    spawn,

    keepAround(options: { dtMs: number; width: number; wanted: number }): void {
      cooldownMs = Math.max(0, cooldownMs - options.dtMs)
      const walking = villagers.filter(villager => villager.state === 'walking').length
      if (cooldownMs === 0 && (walking < MIN_VILLAGERS || walking < options.wanted)) {
        spawn({ width: options.width })
        cooldownMs = SPAWN_COOLDOWN_MS
      }
    },

    nearestWalking(x: number): Villager | undefined {
      return nearestWalking({ villagers, x })
    },

    bite(options: { id: number; fromX: number }): Villager | undefined {
      const victim = villagers.find(villager => villager.id === options.id)
      if (victim) {
        biteVillager({ villager: victim, fromX: options.fromX })
      }
      return victim
    },

    prey(options: { width: number; nearX: number }): number | undefined {
      return spawn({ width: options.width, palette: LANTERN, isFromLeft: true }) ?? nearestWalking({ villagers, x: options.nearX })?.id
    },

    scare(options: { id: number; width: number; fromX: number }): Villager | undefined {
      const prey = villagers.find(villager => villager.id === options.id && villager.state === 'walking')
      if (prey) {
        startFleeing({ villager: prey, width: options.width, fromX: options.fromX })
      }
      return prey
    },

    advance(options: { dtMs: number; width: number }): number[] {
      const result = advanceVillagers({ villagers, dtMs: options.dtMs, width: options.width })
      villagers = result.villagers
      return result.enteredDoors
    },
  }
}

export type Population = ReturnType<typeof createPopulation>
