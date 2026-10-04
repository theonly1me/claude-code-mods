import { cp, readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const candidates = []
for (const plugin of await readdir(resolve(root, 'plugins'))) {
  const source = resolve(root, 'plugins', plugin, '.claude-plugin/types')
  const header = await readFile(resolve(source, 'claude-code/index.d.ts'), 'utf8').catch(() => '')
  const version = header.match(/Written by Claude Code ([\d.]+)/)?.[1]
  if (version) candidates.push({ source, version })
}
candidates.sort((first, second) => second.version.localeCompare(first.version, undefined, { numeric: true }))
const [newest] = candidates
if (!newest) throw Error('Load a plugin once with claude --plugin-dir ./plugins/<name>, then run npm run sdk-types.')
await cp(newest.source, resolve(root, '.claude-types'), { recursive: true })
console.log(`Copied Claude Code ${newest.version} types from ${newest.source}`)
