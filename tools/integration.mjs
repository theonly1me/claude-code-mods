import { cp, mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { inlineRegister } from './inline-register.mjs'

const root = resolve(import.meta.dirname, '..')
const directory = await mkdtemp(resolve(tmpdir(), 'mods-integration-'))
await mkdir(resolve(directory, '.claude-plugin'), { recursive: true })
await writeFile(resolve(directory, '.claude-plugin/plugin.json'), JSON.stringify({ name: 'integration-check', version: '0.1.0', types: './types/index.d.ts' }))
await mkdir(resolve(directory, 'hooks'), { recursive: true })
await writeFile(resolve(directory, 'hooks/hooks.json'), JSON.stringify({ modules: ['./register.ts'] }))
await writeFile(resolve(directory, 'hooks/register.ts'), "export const register = on => { on('session.start', ($, event, next) => next(event)) }\n")
await cp(resolve(root, 'types'), resolve(directory, 'types'), { recursive: true })
await cp(resolve(root, 'types/contracts.d.ts'), resolve(directory, 'types/index.d.ts'))
const names = ['bugbound', 'little-harvest', 'samurai-dojo', 'pocket-familiar', 'change-journal', 'behavior-map']
for (const name of names) {
  await mkdir(resolve(directory, 'siblings', name, 'hooks'), { recursive: true })
  await writeFile(resolve(directory, 'siblings', name, 'hooks/register.js'), await inlineRegister(resolve(root, 'plugins', name, 'hooks/register.ts')))
}
await cp(resolve(root, 'tools/integration'), resolve(directory, 'tests'), { recursive: true })
const result = spawnSync('claude', ['plugin', 'test', directory], { stdio: 'inherit', timeout: 30000 })
if (result.status !== 0) process.exit(1)
