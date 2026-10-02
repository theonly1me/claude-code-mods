import { expect, test } from 'claude-code/testing'
import { petStage, parseProgress, totalProgress } from '../hooks/shared/progress'

test('a companion grows at completed-turn milestones', () => {
  expect(petStage(0)).toBe('egg')
  expect(petStage(1)).toBe('hatchling')
  expect(petStage(10)).toBe('juvenile')
  expect(petStage(50)).toBe('adult')
})

test('separate session contributions aggregate without overwriting each other', () => {
  expect(totalProgress([parseProgress({ completed: 6, harvests: 24 }), parseProgress({ completed: 4, harvests: 16 })])).toEqual({ completed: 10, harvests: 40, kills: 0 })
  expect(parseProgress({ completed: -10 })).toEqual({ completed: 0, harvests: 0, kills: 0 })
})
