import { expect, test } from 'claude-code/testing'

import { parseVerdict } from '../hooks/scope/confirm'
import { assess, commandChange, editChange, rulesVerdict, writeChange } from '../hooks/scope/rules'
import type { RuleContext } from '../hooks/scope/rules'

function context(overrides: Partial<RuleContext> = {}): RuleContext {
  return {
    root: '/demo',
    task: 'Fix the rounding bug in math.js',
    isSeen: () => false,
    isAllowed: () => false,
    editedPaths: new Set(),
    isManyFilesFlagged: false,
    manyFiles: 8,
    ...overrides,
  }
}

function kinds(options: { change: ReturnType<typeof editChange>; context: RuleContext }): string[] {
  return assess(options).signals.map(signal => `${signal.kind}:${signal.weight}`)
}

const edit = (filePath: string) => editChange({ filePath, oldText: 'a', newText: 'b' })

test('a file the request names is in scope, an unnamed one is a signal, weaker once Claude read it', () => {
  expect(kinds({ change: edit('/demo/math.js'), context: context() })).toEqual([])
  expect(kinds({ change: edit('/demo/docs/notes.md'), context: context() })).toEqual(['unmentioned:2'])
  expect(kinds({ change: edit('/demo/docs/notes.md'), context: context({ isSeen: () => true }) })).toEqual(['unmentioned:1'])
  expect(kinds({ change: edit('/demo/docs/notes.md'), context: context({ isAllowed: path => path.startsWith('docs/') }) })).toEqual([])
  expect(kinds({ change: edit('/tmp/scratch.txt'), context: context() })).toEqual([])
})

test('files outside the project, deletes, and moves score high', () => {
  expect(kinds({ change: edit('/etc/hosts'), context: context() })).toEqual(['outside:3'])
  const removal = commandChange('npm test && rm -rf docs/old.md build')
  expect(removal?.kind).toBe('delete')
  expect(removal?.paths).toEqual(['docs/old.md', 'build'])
  expect(commandChange('git mv src/a.ts src/b.ts')?.kind).toBe('move')
  expect(commandChange('rm /tmp/claude-scratch.txt')).toBeUndefined()
  expect(commandChange('npm run build')).toBeUndefined()
  const scored = assess({ change: commandChange('rm math.js') ?? edit('x'), context: context() })
  expect(scored.signals.map(signal => signal.kind)).toEqual(['delete'])
  expect(rulesVerdict(scored.score)).toBe('mild')
})

test('the file that reaches the many-files limit is a signal once per turn', () => {
  const editedPaths = new Set(['a.js', 'b.js', 'c.js', 'd.js', 'e.js', 'f.js', 'g.js'])
  const task = 'touch a.js b.js c.js d.js e.js f.js g.js math.js'
  expect(kinds({ change: edit('/demo/math.js'), context: context({ editedPaths, task }) })).toEqual(['many-files:2'])
  expect(kinds({ change: edit('/demo/math.js'), context: context({ editedPaths, task, isManyFilesFlagged: true }) })).toEqual([])
  expect(kinds({ change: edit('/demo/a.js'), context: context({ editedPaths, task }) })).toEqual([])
})

test('a write that replaces most of a long file and an edit that drops many lines are rewrites', () => {
  const original = Array.from({ length: 30 }, (_, index) => `line ${index}`).join('\n')
  const rewrite = writeChange({ filePath: '/demo/math.js', content: 'export const all = 1\n', original })
  expect(kinds({ change: rewrite, context: context() })).toEqual(['rewrite:2'])
  const tweak = writeChange({ filePath: '/demo/math.js', content: `${original}\nline 30`, original })
  expect(kinds({ change: tweak, context: context() })).toEqual([])
  expect(writeChange({ filePath: '/demo/new.js', content: 'x', original: undefined }).kind).toBe('create')
  const cut = editChange({ filePath: '/demo/math.js', oldText: original + '\n' + original, newText: 'gone' })
  expect(kinds({ change: cut, context: context() })).toEqual(['rewrite:2'])
  expect(rulesVerdict(4)).toBe('clear')
  expect(rulesVerdict(1)).toBe('in-scope')
})

test('the confirm reply parses from noisy text and refuses unknown verdicts', () => {
  expect(parseVerdict('Sure. {"verdict":"clear","reason":"It edits the README \u2014 not asked."}')).toEqual({
    verdict: 'clear',
    reason: 'It edits the README , not asked.',
  })
  expect(parseVerdict('{"verdict":"maybe","reason":"x"}')).toBeUndefined()
  expect(parseVerdict('no json here')).toBeUndefined()
})
