import { expect, test } from 'claude-code/testing'
import { createWorld, beginWorld, finishActivity, finishWorld, snapshotWorld, restoreWorld } from '../hooks/shared/world'

test('a completed turn grows crops and harvests exactly once', () => {
  const world = createWorld()
  beginWorld(world)
  finishActivity({ world, activity: 'editing', successful: true })
  expect(world.crops).toBeGreaterThan(1)
  finishWorld({ world, successful: true })
  expect(world.harvests).toBe(4)
  expect(world.beds).toEqual([4])
})

test('an interrupted bed remains growing when a new turn plants seeds', () => {
  const world = createWorld()
  beginWorld(world)
  finishActivity({ world, activity: 'reading', successful: true })
  finishWorld({ world, successful: false })
  expect(world.harvests).toBe(0)
  expect(world.beds.length).toBe(1)
  beginWorld(world)
  expect(world.beds.length).toBe(1)
  expect(world.crops).toBe(1)
})

test('a reload snapshot preserves an unfinished main turn without aliasing its crops', () => {
  const original = createWorld()
  beginWorld(original)
  finishActivity({ world: original, activity: 'editing', successful: true })
  original.beds = [4, 3]
  const snapshot = snapshotWorld(original)
  const restored = createWorld()
  restoreWorld({ world: restored, snapshot })
  expect(restored.working).toBe(true)
  expect(restored.crops).toBe(original.crops)
  restored.beds.push(4)
  expect(original.beds.length).toBe(2)
  finishWorld({ world: restored, successful: true })
  expect(restored.harvests).toBe(4)
})
