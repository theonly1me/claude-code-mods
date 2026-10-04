import { cp, mkdir, readdir, readFile, rm, stat } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const sharedRoot = resolve(root, 'shared')
const importPattern = /from\s+['"](\.{1,2}\/[^'"]+)['"]/g
const extensions = ['', '.ts', '.tsx']

async function isFile(path) {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

async function resolveImport({ fromFile, specifier }) {
  const base = resolve(dirname(fromFile), specifier)
  for (const extension of extensions) {
    if (await isFile(base + extension)) return base + extension
  }
  return undefined
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => [])
  const files = []
  for (const entry of entries) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory() && entry.name !== 'shared') files.push(...(await sourceFiles(path)))
    if (entry.isFile() && /\.tsx?$/.test(entry.name)) files.push(path)
  }
  return files
}

async function sharedImportsOf({ file, pluginShared }) {
  const text = await readFile(file, 'utf8')
  const found = []
  for (const [, specifier] of text.matchAll(importPattern)) {
    const target = resolve(dirname(file), specifier)
    const insideShared = target.startsWith(pluginShared + '/') ? relative(pluginShared, target) : undefined
    const sharedTarget = file.startsWith(sharedRoot + '/') ? relative(sharedRoot, target) : insideShared
    if (sharedTarget === undefined) continue
    const resolved = await resolveImport({ fromFile: resolve(sharedRoot, 'index.ts'), specifier: './' + sharedTarget })
    if (resolved) found.push(resolved)
  }
  return found
}

async function neededSharedFiles(plugin) {
  const pluginRoot = resolve(root, 'plugins', plugin)
  const pluginShared = resolve(pluginRoot, 'hooks', 'shared')
  const queue = [...(await sourceFiles(resolve(pluginRoot, 'hooks'))), ...(await sourceFiles(resolve(pluginRoot, 'tests')))]
  const needed = new Set()
  while (queue.length > 0) {
    const file = queue.pop()
    for (const sharedFile of await sharedImportsOf({ file, pluginShared })) {
      if (needed.has(sharedFile)) continue
      needed.add(sharedFile)
      queue.push(sharedFile)
    }
  }
  return [...needed]
}

const [only] = process.argv.slice(2)
const plugins = only ? [only] : await readdir(resolve(root, 'plugins'))
for (const plugin of plugins) {
  const pluginShared = resolve(root, 'plugins', plugin, 'hooks', 'shared')
  const files = await neededSharedFiles(plugin)
  await rm(pluginShared, { recursive: true, force: true })
  for (const file of files) {
    const target = resolve(pluginShared, relative(sharedRoot, file))
    await mkdir(dirname(target), { recursive: true })
    await cp(file, target)
  }
  console.log(`${plugin}: ${files.length} shared files`)
}
