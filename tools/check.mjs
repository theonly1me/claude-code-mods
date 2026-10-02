import { readdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const [operation = 'validate'] = process.argv.slice(2)
if (!['validate', 'test'].includes(operation)) throw Error('Choose validate or test')
const root = resolve(import.meta.dirname, '..')
if (operation === 'validate') {
  const result = spawnSync('claude', ['plugin', 'validate', '--strict', root], { stdio: 'inherit' })
  if (result.status !== 0) process.exit(1)
}
for (const plugin of await readdir(resolve(root, 'plugins'))) {
  const argumentsList = ['plugin', operation]
  if (operation === 'validate') argumentsList.push('--strict')
  argumentsList.push(resolve(root, 'plugins', plugin))
  const result = spawnSync('claude', argumentsList, { stdio: 'inherit' })
  if (result.status !== 0) process.exit(1)
}
