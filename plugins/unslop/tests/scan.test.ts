import { expect, test } from 'claude-code/testing'

import { isStillPresent, parseDetection, withSnapshots } from '../hooks/slop/detect'
import { isIgnoredPath } from '../hooks/slop/paths'
import { scanSegments, scanText } from '../hooks/slop/scan'
import { segmentsFromPatch, segmentsFromStrings } from '../hooks/slop/segments'
import type { Finding } from '../hooks/slop/types'

const EM_DASH = String.fromCodePoint(0x2014)
const EN_DASH = String.fromCodePoint(0x2013)

function kindsIn(options: { path: string; text: string }): string[] {
  return scanText({ ...options, commentBlockLines: 4 }).map(candidate => candidate.kind)
}

test('dashes are found in code, comments, and docs', () => {
  const found = scanText({ path: 'src/cart.ts', text: `// Sums the cart ${EM_DASH} fast\nconst range = '1${EN_DASH}5'`, commentBlockLines: 4 })
  expect(found.map(candidate => candidate.kind)).toEqual(['dash', 'dash'])
  expect(found[0]?.advice).toContain('em dash')
  expect(found[1]?.advice).toContain('en dash')
  expect(found[1]?.line).toBe(2)
})

test('a large comment block is found, a short one and a license header are not', () => {
  const block = ['/**', ' * Returns the total of the cart.', ' * It adds each line.', ' * It returns a number.', ' */', 'export function total() {}'].join('\n')
  expect(kindsIn({ path: 'src/cart.ts', text: block })).toEqual(['comment-block'])
  expect(kindsIn({ path: 'src/cart.ts', text: '// Totals include tax.\nexport const rate = 0.2' })).toEqual([])
  const license = ['# Copyright 2026 Example', '# Licensed under MIT', '# See LICENSE', '# for details', 'import os'].join('\n')
  expect(kindsIn({ path: 'tool.py', text: license })).toEqual([])
})

test('a comment that repeats the next line is found, a real reason is not', () => {
  expect(kindsIn({ path: 'src/cart.ts', text: '  // Return the result\n  return result' })).toEqual(['restating-comment'])
  expect(kindsIn({ path: 'src/cart.ts', text: '  // Stripe rounds half up, so match it\n  return Math.round(total)' })).toEqual([])
  expect(kindsIn({ path: 'src/cart.ts', text: '  // eslint-disable-next-line no-console\n  console.log(value)' })).toEqual([])
})

test('slop tests are found only in test files', () => {
  const tautology = "test('works', () => {\n  expect(true).toBe(true)\n})"
  expect(kindsIn({ path: 'src/cart.test.ts', text: tautology })).toEqual(['slop-test'])
  const empty = "it('adds items', () => {\n  const cart = createCart()\n  cart.add(item)\n})"
  expect(kindsIn({ path: 'src/cart.test.ts', text: empty })).toEqual(['slop-test'])
  const weak = "it('makes a cart', () => {\n  const cart = createCart()\n  expect(cart).toBeDefined()\n})"
  expect(scanText({ path: 'tests/cart.spec.ts', text: weak, commentBlockLines: 4 })[0]?.advice).toContain('only checks that a value exists')
  const real = "it('sums lines', () => {\n  expect(total([1, 2])).toBe(3)\n})"
  expect(kindsIn({ path: 'src/cart.test.ts', text: real })).toEqual([])
  expect(kindsIn({ path: 'src/cart.ts', text: tautology })).toEqual([])
  expect(kindsIn({ path: 'tests/test_cart.py', text: 'def test_total():\n    cart = Cart()\n\nimport os' })).toEqual(['slop-test'])
})

test('AI phrases and emoji are found in docs and comments, not in code', () => {
  expect(kindsIn({ path: 'README.md', text: 'This robust library lets you delve into carts.\n## 🚀 Features' })).toEqual(['ai-phrase', 'emoji'])
  expect(kindsIn({ path: 'src/cart.ts', text: '// A seamless way to sum\nconst robust = true' })).toEqual(['ai-phrase'])
  expect(kindsIn({ path: 'README.md', text: '```\nconst robust = 1\n```\nPlain words here.' })).toEqual([])
})

test('ignored paths and segments from diffs', () => {
  expect(isIgnoredPath('node_modules/a/index.js')).toBe(true)
  expect(isIgnoredPath('package-lock.json')).toBe(true)
  expect(isIgnoredPath('dist/app.min.js')).toBe(true)
  expect(isIgnoredPath('src/cart.ts')).toBe(false)
  const segments = segmentsFromPatch([{ newStart: 10, lines: [' keep', `+// new ${EM_DASH} line`, '-old', ' keep'] }])
  expect(segments).toEqual([{ startLine: 11, lines: [`// new ${EM_DASH} line`] }])
  expect(scanSegments({ path: 'a.ts', segments, commentBlockLines: 4 })[0]?.line).toBe(11)
  expect(segmentsFromStrings({ before: 'a\nb', after: 'a\nc\nb' })).toEqual([{ startLine: undefined, lines: ['c'] }])
})

test('model findings must quote an added line, and removal is checked by rescanning', () => {
  const added = ['  // Now we loop over the items', '  for (const item of items) total += item']
  const parsed = parseDetection({
    text: 'sure {"findings":[{"line":"// Now we loop over the items","kind":"comment","fix":"Remove it."},{"line":"made up","kind":"test","fix":"x"},{"line":"for (const item of items) total += item","kind":"comment","fix":"x"}]}',
    path: 'src/cart.ts',
    addedLines: added,
  })
  expect(parsed).toEqual([{ kind: 'restating-comment', line: undefined, excerpt: '// Now we loop over the items', advice: 'Remove it.' }])
  const dash: Finding = {
    kind: 'dash', line: 1, excerpt: `// fast ${EM_DASH} cheap`, advice: '', id: 1, path: 'a.ts', absolutePath: '/r/a.ts', source: 'rules', status: 'open', isNotified: true, turn: 1,
  }
  expect(isStillPresent({ finding: dash, text: `// fast ${EM_DASH} cheap\nx()`, commentBlockLines: 4 })).toBe(true)
  expect(isStillPresent({ finding: dash, text: '// fast, cheap\nx()', commentBlockLines: 4 })).toBe(false)
  const mocked = "test('adds', () => {\n  expect(mockAdd).toHaveBeenCalled()\n})"
  const [snapshot] = withSnapshots({ candidates: [{ kind: 'slop-test', line: undefined, excerpt: "test('adds', () => {", advice: '' }], text: mocked })
  const tested: Finding = { ...dash, ...snapshot, path: 'a.test.ts', source: 'model' }
  expect(isStillPresent({ finding: tested, text: mocked, commentBlockLines: 4 })).toBe(true)
  expect(isStillPresent({ finding: tested, text: "test('adds', () => {\n  expect(add(1, 2)).toBe(3)\n})", commentBlockLines: 4 })).toBe(false)
})
