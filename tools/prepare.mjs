import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
for (const plugin of await readdir(resolve(root, 'plugins'))) {
  await mkdir(resolve(root, 'plugins', plugin, 'hooks', 'shared'), { recursive: true })
  await cp(resolve(root, 'shared'), resolve(root, 'plugins', plugin, 'hooks', 'shared'), { recursive: true })
  const contract = await readFile(resolve(root, 'types', 'contracts.d.ts'), 'utf8')
  await writeFile(resolve(root, 'plugins', plugin, 'types', 'index.d.ts'), contract.replaceAll('../shared/', '../hooks/shared/'))
}
