import { expect, test } from 'claude-code/testing'

import { FRAME_MS, STAGE_HEIGHT } from '../hooks/sim/constants'
import { cropForPath, isTestCommand, stageForLines } from '../hooks/sim/crops'
import { createFarm } from '../hooks/sim/farm'
import { parseNumstat, userChanges } from '../hooks/sim/ledger'

test('each kind of file grows its own crop', () => {
  expect(cropForPath('test/cart.test.ts')).toBe('pumpkin')
  expect(cropForPath('src/__tests__/a.js')).toBe('pumpkin')
  expect(cropForPath('src/cart.ts')).toBe('corn')
  expect(cropForPath('README.md')).toBe('sunflower')
  expect(cropForPath('styles/app.css')).toBe('tulip')
  expect(cropForPath('package.json')).toBe('wheat')
  expect(cropForPath('assets/logo.svg')).toBe('carrot')
})

test('lines changed move a crop from seed to ripe', () => {
  expect(stageForLines(0)).toBe('seed')
  expect(stageForLines(1)).toBe('sprout')
  expect(stageForLines(10)).toBe('growing')
  expect(stageForLines(30)).toBe('ripe')
  const farm = createFarm()
  farm.tend({ path: 'src/a.ts', lines: 6 })
  farm.tend({ path: 'src/a.ts', lines: 6 })
  expect(farm.plots()).toHaveLength(1)
  expect(stageForLines(farm.plots()[0]?.lines ?? 0)).toBe('growing')
})

test('a failing test wilts test plots until a passing one', () => {
  const farm = createFarm()
  farm.tend({ path: 'test/a.test.ts', lines: 40 })
  farm.tend({ path: 'src/a.ts', lines: 40 })
  farm.testRan({ isPassing: false })
  expect(farm.plots().map(plot => plot.isWilted)).toEqual([true, false])
  farm.testRan({ isPassing: true })
  expect(farm.plots().every(plot => !plot.isWilted)).toBe(true)
})

test('only a turn with a passing test harvests, and ripe plots go back to seed', () => {
  const farm = createFarm()
  farm.restore({ lifetimeBushels: 10 })
  farm.tend({ path: 'src/a.ts', lines: 40 })
  farm.tend({ path: 'src/b.ts', lines: 3 })
  farm.beginTurn()
  expect(farm.endTurn()).toBe(0)
  farm.beginTurn()
  farm.testRan({ isPassing: true })
  expect(farm.endTurn()).toBe(1)
  expect(farm.summary()).toEqual({ plots: 2, ripe: 0, sessionBushels: 1, lifetimeBushels: 11 })
  expect(farm.plots()[0]?.lines).toBe(0)
})

test('the user changes left after Claude edits come from git counts', () => {
  expect(userChanges(parseNumstat('3\t1\tsrc/a.ts'))).toEqual([])
  expect(userChanges(parseNumstat('9\t1\tsrc/a.ts\n2\t0\tdocs/x.md'))).toEqual([
    { path: 'src/a.ts', lines: 6 },
    { path: 'docs/x.md', lines: 2 },
  ])
  expect(isTestCommand('npm test')).toBe(true)
  expect(isTestCommand('git status')).toBe(false)
})

test('frames fill the stage at any width', () => {
  const farm = createFarm()
  farm.resize(44)
  farm.tend({ path: 'src/a.ts', lines: 40 })
  farm.tick(FRAME_MS)
  const bitmap = farm.frame()
  expect(bitmap.width).toBe(44)
  expect(bitmap.height).toBe(STAGE_HEIGHT)
  expect(bitmap.pixels.every(pixel => pixel !== null)).toBe(true)
})
