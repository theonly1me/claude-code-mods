import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { encodeGif } from './gif.ts'

const [plugin, output] = process.argv.slice(2)
if (!plugin) throw Error('Usage: npm run animate -- <plugin> [output.gif]')
const root = resolve(import.meta.dirname, '..')
const { animation } = await import(pathToFileURL(resolve(root, 'tools', 'storyboards', `${plugin}.ts`)).href)
if (typeof animation !== 'function') throw Error(`${plugin} has no animation() in its storyboard`)
const { frameMs, bitmaps } = animation()
const gif = encodeGif({ bitmaps, scale: 6, frameMs, background: 0x1a1b26 })
const target = output ? resolve(output) : resolve(root, 'plugins', plugin, 'assets', 'preview.gif')
await writeFile(target, gif)
console.log(`${plugin}: wrote ${target} with ${bitmaps.length} frames, ${Math.round(gif.length / 1024)} KiB`)
