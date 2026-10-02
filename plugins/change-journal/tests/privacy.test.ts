import { expect, test } from 'claude-code/testing'
import { safePath, sanitize, excerpt } from '../hooks/shared/privacy'
import { completeEvidence } from '../hooks/shared/analysis/evidence'
import type { Evidence } from '../hooks/shared/analysis/types'

test('credential files and paths outside the project never provide code evidence', () => {
  for (const path of ['/demo/.env.local', '/demo/.ssh/id_rsa', '/demo/.aws/credentials', '/demo/server.key', '/outside/cart.ts', '../cart.ts']) expect(safePath({ path, root: '/demo' })).toBeUndefined()
  expect(safePath({ path: '/demo/src/cart.ts', root: '/demo' })).toBe('src/cart.ts')
  expect(excerpt('a'.repeat(10000)).length).toBe(3000)
  expect(sanitize('password="example"')).not.toContain('example')
  expect(sanitize('{"password":"example"}')).not.toContain('example')
  expect(sanitize('-----BEGIN PRIVATE KEY-----\nexample')).not.toContain('example')
  expect(sanitize('Bearer abc.def.ghi')).not.toContain('abc.def.ghi')
})

test('shell changes retain the concurrency attribution limit and observed status', () => {
  const evidence: Evidence = { id: 'e1', tool: 'Bash', kind: 'command', status: 'pending', target: 'format cart.ts', before: '', after: '', detail: '' }
  const result = completeEvidence({ evidence, result: { result: 'formatted' }, shellBefore: 'old', shellAfter: 'new' })
  expect(result.detail).toContain('concurrent edits may be included')
  expect(result.status).toBe('successful')
  const denied = completeEvidence({ evidence, result: { deny: 'Denied' }, shellBefore: 'old', shellAfter: 'new' })
  expect(denied.before).toBe('')
  expect(denied.status).toBe('denied')
})
