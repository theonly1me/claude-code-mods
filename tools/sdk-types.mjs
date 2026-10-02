import { cp, access } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const source = resolve(root, 'plugins/night-feast/.claude-plugin/types')
try { await access(source) } catch { throw Error('Load plugins once with claude --plugin-dir ./plugins, then run npm run sdk-types.') }
await cp(source, resolve(root, '.claude-types'), { recursive: true })
