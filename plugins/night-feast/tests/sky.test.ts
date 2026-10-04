import { expect, test } from 'claude-code/testing'

import { MOON_LEFT } from '../hooks/sim/constants'
import { createSky, dawnAmount, moonPosition } from '../hooks/sim/sky'

test('warnings fire once at 80 and 90 percent', () => {
  const sky = createSky()
  expect(sky.measure(50).toast).toBeUndefined()
  expect(sky.measure(81).toast).toContain('80% full')
  expect(sky.measure(85).toast).toBeUndefined()
  expect(sky.measure(92).toast).toContain('Run /compact soon')
  expect(sky.measure(95).toast).toBeUndefined()
})

test('a compaction starts a new night and resets the warnings', () => {
  const sky = createSky()
  sky.measure(88)
  const cleared = sky.measure(null)
  expect(cleared.isNewNight).toBe(true)
  expect(sky.state()).toEqual({ percent: null, night: 2 })

  expect(sky.measure(84).toast).toContain('80% full')
  expect(sky.measure(20).isNewNight).toBe(true)
  expect(sky.state().night).toBe(3)
})

test('an explicit compaction only counts after a reading', () => {
  const sky = createSky()
  sky.compacted()
  expect(sky.state().night).toBe(1)
  sky.measure(40)
  sky.compacted()
  expect(sky.state().night).toBe(2)
  expect(sky.measure(null).isNewNight).toBe(false)
})

test('the moon rises with the context fill and dawn warms past 70 percent', () => {
  expect(moonPosition({ percent: null, width: 72 })).toEqual({ x: MOON_LEFT, y: 2 })
  expect(moonPosition({ percent: 50, width: 72 }).y).toBe(0)
  expect(moonPosition({ percent: 100, width: 72 }).x).toBe(72 - 26)
  expect(dawnAmount(null)).toBe(0)
  expect(dawnAmount(70)).toBe(0)
  expect(dawnAmount(85)).toBe(0.5)
  expect(dawnAmount(100)).toBe(1)
})
