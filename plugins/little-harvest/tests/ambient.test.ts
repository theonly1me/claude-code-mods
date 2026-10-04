import { expect, test } from 'claude-code/testing'

import { startOfSeason } from '../hooks/shared/pixel/seasons'
import { FRAME_MS } from '../hooks/sim/constants'
import { createFarm } from '../hooks/sim/farm'
import type { Farm } from '../hooks/sim/farm'

function run(options: { farm: Farm; ms: number; each?: () => void }): void {
  for (let elapsedMs = 0; elapsedMs < options.ms; elapsedMs += FRAME_MS) {
    options.farm.tick(FRAME_MS)
    options.each?.()
  }
}

test('an idle farm keeps busy with at least four different chores in a minute', () => {
  const farm = createFarm()
  farm.tend({ path: 'src/a.ts', lines: 12 })
  const chores = new Set<string>()
  let idleFrames = 0
  run({
    farm,
    ms: 60000,
    each: () => {
      const activity = farm.activity()
      if (activity.task === 'idle') {
        idleFrames += 1
      } else if (!activity.isWork) {
        chores.add(activity.task)
      }
    },
  })
  expect(chores.size).toBeGreaterThanOrEqual(4)
  expect(idleFrames).toBe(0)
  expect(farm.log().length).toBeGreaterThan(3)
})

test('ambient chores never change crops or bushels', () => {
  const farm = createFarm()
  farm.restore({ lifetimeBushels: 5 })
  farm.tend({ path: 'src/a.ts', lines: 40 })
  farm.tend({ path: 'test/a.test.ts', lines: 3 })
  const before = { plots: farm.plots().map(plot => ({ ...plot })), summary: farm.summary() }
  run({ farm, ms: 120000 })
  expect(farm.plots()).toEqual(before.plots)
  expect(farm.summary()).toEqual(before.summary)
})

test('real work interrupts a chore and sends the farmer to the plot', () => {
  const farm = createFarm()
  run({ farm, ms: 5000 })
  expect(farm.activity().isWork).toBe(false)
  farm.tend({ path: 'src/b.ts', lines: 2 })
  expect(farm.activity()).toEqual({ task: 'hoe', isWork: true })
})

test('the season follows the clock, five minutes each', () => {
  const farm = createFarm()
  farm.begin(startOfSeason({ name: 'winter' }))
  expect(farm.calendar.season().name).toBe('winter')
  run({ farm, ms: 5 * 60 * 1000 })
  expect(farm.calendar.season().name).toBe('blossom')
  expect(farm.log()).toContain('Cherry blossom comes to the farm')
  farm.begin(startOfSeason({ name: 'autumn', cycle: 3 }))
  expect(farm.calendar.season().name).toBe('autumn')
  expect(farm.calendar.next().label).toBe('Winter')
})
