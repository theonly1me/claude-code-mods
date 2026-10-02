import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createBitmap, stampScaled } from '../shared/render/bitmap.ts'
import { createWorld } from '../shared/world.ts'
import { drawGame } from '../shared/game/draw.ts'
import { drawVampire } from '../shared/game/character.ts'
import { drawFarm } from '../shared/farm.ts'
import { drawPet } from '../shared/pet.ts'
import { drawTraining } from '../plugins/samurai-dojo/hooks/training.ts'
import { createDojo } from '../plugins/samurai-dojo/hooks/sim/dojo.ts'
import { encodePng, rasterizeSheet } from './png.ts'
import { analysisPreview } from './preview-analysis.mjs'

const root = resolve(import.meta.dirname, '..')
const gallery = []
for (const name of ['night-feast', 'little-harvest', 'pocket-familiar', 'samurai-dojo']) {
  const bitmaps = []
  const states = name === 'samurai-dojo' ? ['searching', 'reading', 'editing', 'testing', 'working', 'idle'] : name === 'night-feast' ? ['hunting', 'feeding', 'jumping'] : ['reading', 'editing', 'testing']
  for (const [index, activity] of states.entries()) {
    const world = createWorld()
    world.activity = name === 'night-feast' ? 'working' : activity; world.tick = 20 + index * 18; world.working = activity !== 'idle'
    world.completed = [0, 10, 50][index % 3]; world.crops = [1, 2, 4][index % 3]; world.beds = [4, 3, 4]
    world.game.x = 10 + index * 28
    const bitmap = createBitmap({ width: 128, height: 40 })
    if (name === 'night-feast') {
      if (index === 1) { world.game.feeding = { x: world.game.x + 8, startedAt: 0 }; world.game.clock = 240 }
      if (index === 2) { world.game.grounded = false; world.game.y = 13 }
      drawGame({ bitmap, game: world.game, tick: world.tick })
    }
    if (name === 'little-harvest') drawFarm({ bitmap, world })
    if (name === 'pocket-familiar') drawPet({ bitmap, world })
    if (name === 'samurai-dojo') {
      if (activity === 'searching') {
        const dojo = createDojo(); dojo.resize(64); const identifier = dojo.spawn({ isElite: false }); dojo.defeat({ id: identifier, isFailure: false }); dojo.tick({ dtMs: 240 })
        stampScaled({ target: bitmap, source: dojo.frame(), x: 0, y: 8, scale: 2 })
      } else drawTraining({ bitmap, world })
    }
    bitmaps.push(bitmap)
  }
  const directory = resolve(root, 'plugins', name, 'assets')
  await mkdir(directory, { recursive: true })
  await writeFile(resolve(directory, 'preview.png'), encodePng(rasterizeSheet({ bitmaps, columns: 3, scale: 4, gap: 16, background: 0x101522 })))
  if (name === 'night-feast') {
    const portrait = createBitmap({ width: 24, height: 16 })
    portrait.pixels.fill(0x191c2e)
    const game = createWorld().game; game.x = 8
    drawVampire({ bitmap: portrait, game, tick: 5, camera: 0, ground: 13, scale: 1 })
    await writeFile(resolve(directory, 'vampire.png'), encodePng(rasterizeSheet({ bitmaps: [portrait], columns: 1, scale: 16, gap: 0, background: 0x191c2e })))
  }
  gallery.push('<section><h2>' + name + '</h2><p>' + states.join(' · ') + '</p><img src="../plugins/' + name + '/assets/preview.png" alt="' + name + ' pixel scenes"></section>')
}
for (const name of ['change-journal', 'behavior-map']) {
  const directory = resolve(root, 'plugins', name, 'assets')
  await mkdir(directory, { recursive: true })
  await writeFile(resolve(directory, 'preview.svg'), analysisPreview(name === 'behavior-map'))
  gallery.push('<section><h2>' + name + '</h2><img src="../plugins/' + name + '/assets/preview.svg" alt="' + name + ' synthetic evidence view"></section>')
}
await mkdir(resolve(root, 'previews'), { recursive: true })
await writeFile(resolve(root, 'previews/index.html'), '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Claude Code Mods previews</title><style>body{background:#101522;color:#f5ead3;font:16px system-ui;max-width:1100px;margin:40px auto;padding:0 24px}h1,h2{color:#ffd166}section{margin:40px 0}img{width:100%;image-rendering:pixelated;border-radius:12px}p{color:#b393de}</style><h1>Claude Code Mods</h1><p>Rendered scenes and synthetic change evidence. Frame strips show several activities; installed scenes animate.</p>' + gallery.join('') + '</html>')
console.log('Generated six previews and previews/index.html')
