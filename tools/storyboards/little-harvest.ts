import { FRAME_MS } from '../../plugins/little-harvest/hooks/sim/constants.ts'
import { createFarm } from '../../plugins/little-harvest/hooks/sim/farm.ts'
import { runScript } from './script.ts'
import type { Storyboard } from './script.ts'

const FILES = [
  { path: 'docs/guide.md', lines: 34 },
  { path: 'src/cart.ts', lines: 4 },
  { path: 'test/cart.test.ts', lines: 35 },
  { path: 'styles/app.css', lines: 30 },
  { path: 'package.json', lines: 15 },
  { path: 'assets/logo.svg', lines: 31 },
  { path: 'src/server.go', lines: 40 },
]

export function storyboard(): Storyboard {
  const farm = createFarm()
  farm.restore({ lifetimeBushels: 41 })
  const bitmaps = runScript({
    frameMs: FRAME_MS,
    endMs: 15200,
    captureAtMs: [800, 3200, 4520, 5600, 11880, 13160, 13520, 14120, 15000],
    events: [
      { atMs: 0, run: () => farm.setHour(10.5) },
      ...FILES.map((file, index) => ({ atMs: index * 40, run: () => farm.tend(file) })),
      { atMs: 2000, run: () => farm.tend({ path: 'src/cart.ts', lines: 8 }) },
      { atMs: 4000, run: () => farm.testRan({ isPassing: false }) },
      { atMs: 11600, run: () => farm.testRan({ isPassing: true }) },
      { atMs: 12880, run: () => farm.endTurn() },
      { atMs: 14080, run: () => farm.setHour(18.8) },
      { atMs: 14800, run: () => farm.setHour(23) },
    ],
    tick: dtMs => farm.tick(dtMs),
    frame: () => farm.frame(),
  })
  return { bitmaps, note: JSON.stringify(farm.summary()) }
}
