import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { encodePng, rasterizeSheet } from './png.ts'

const [plugin, output] = process.argv.slice(2)
if (!plugin) throw Error('Usage: npm run storyboard -- <plugin> [output.png]')
const root = resolve(import.meta.dirname, '..')
const { storyboard } = await import(pathToFileURL(resolve(root, 'tools', 'storyboards', `${plugin}.ts`)).href)
const { bitmaps, note } = storyboard()
const sheet = rasterizeSheet({ bitmaps, columns: 3, scale: 5, gap: 8, background: 0x1a1b26 })
const target = output ? resolve(output) : resolve(root, 'plugins', plugin, 'assets', 'preview.png')
await writeFile(target, encodePng(sheet))
console.log(`${plugin}: wrote ${target} with ${bitmaps.length} frames (${note})`)
