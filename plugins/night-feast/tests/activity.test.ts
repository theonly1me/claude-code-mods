import { expect, test } from 'claude-code/testing'
import { classifyActivity, isTestCommand, isTestEdit, currentActivity } from '../hooks/shared/activity'
import type { Activity } from '../hooks/shared/activity'
import { createWorld, finishActivity } from '../hooks/shared/world'

test('only recognized commands with an observable final test status count as checks', () => {
  for (const command of ['npm test', 'cd app && npm run test:unit', 'node --test cart.test.mjs', 'python3 -m pytest']) expect(isTestCommand(command)).toBe(true)
  for (const command of ['echo "npm test"', 'npm test || true', 'npm test; echo done', 'custom-check', 'npm test && echo done']) expect(isTestCommand(command)).toBe(false)
  expect(classifyActivity({ tool: 'Bash', command: 'echo "npm test"', tool_use_id: 'one' })).toBe('working')
})

test('concurrent tool IDs return to the remaining activity when one finishes', () => {
  const active = new Map<string, Activity>([['reading', 'reading'], ['editing', 'editing']])
  expect(currentActivity({ active, isWorking: true })).toBe('editing')
  active.delete('editing')
  expect(currentActivity({ active, isWorking: true })).toBe('reading')
  active.clear()
  expect(currentActivity({ active, isWorking: false })).toBe('idle')
})

test('test edits build terrain and denied checks do not create fake failures', () => {
  const world = createWorld()
  const edit = { tool: 'Edit', file_path: '/demo/cart.test.ts', old_string: 'false', new_string: 'true', tool_use_id: 'one' }
  expect(isTestEdit(edit)).toBe(true)
  finishActivity({ world, activity: 'editing', successful: true, testEdit: isTestEdit(edit) })
  expect(world.game.platforms.length).toBe(3)
  finishActivity({ world, activity: 'testing', successful: false, denied: true })
  expect(world.game.failedChecks).toBe(0)
})
