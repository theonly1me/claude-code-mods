import type { Bitmap } from '../../shared/pixel/bitmap.ts'
import { startOfSeason } from '../../shared/pixel/seasons.ts'
import type { SeasonName } from '../../shared/pixel/seasons.ts'
import { FRAME_MS } from '../../plugins/little-harvest/hooks/sim/constants.ts'
import { createFarm } from '../../plugins/little-harvest/hooks/sim/farm.ts'
import type { Farm } from '../../plugins/little-harvest/hooks/sim/farm.ts'
import { runScript } from './script.ts'
import type { ScriptedEvent, Storyboard } from './script.ts'

const FILES = [
  { path: 'docs/guide.md', lines: 34 },
  { path: 'src/cart.ts', lines: 14 },
  { path: 'test/cart.test.ts', lines: 35 },
  { path: 'styles/app.css', lines: 30 },
  { path: 'package.json', lines: 4 },
]

type Act = { season: SeasonName; hour: number; seed: number; files: number; endMs: number; captureAtMs: readonly number[]; events: (farm: Farm) => ScriptedEvent[] }

const ACTS: readonly Act[] = [
  { season: 'winter', hour: 9.5, seed: 3, files: 3, endMs: 9000, captureAtMs: [3600, 7600], events: () => [] },
  {
    season: 'blossom',
    hour: 11,
    seed: 11,
    files: 4,
    endMs: 9000,
    captureAtMs: [2400, 8000],
    events: farm => [{ atMs: 1600, run: () => farm.tend({ path: 'src/cart.ts', lines: 9 }) }],
  },
  {
    season: 'summer',
    hour: 19.4,
    seed: 5,
    files: 5,
    endMs: 9000,
    captureAtMs: [1400, 7200],
    events: farm => [{ atMs: 400, run: () => farm.testRan({ isPassing: false }) }],
  },
  {
    season: 'autumn',
    hour: 16,
    seed: 9,
    files: 5,
    endMs: 9000,
    captureAtMs: [1200, 2000, 7600],
    events: farm => [
      { atMs: 200, run: () => farm.testRan({ isPassing: true }) },
      { atMs: 800, run: () => farm.endTurn() },
    ],
  },
]

function farmFor(act: Act): Farm {
  const farm = createFarm({ seed: act.seed })
  farm.restore({ lifetimeBushels: 41 })
  farm.begin(startOfSeason({ name: act.season }) + 30000)
  farm.setHour(act.hour)
  FILES.slice(0, act.files).forEach(file => farm.tend(file))
  farm.beginTurn()
  for (let elapsedMs = 0; elapsedMs < 6000; elapsedMs += FRAME_MS) {
    farm.tick(FRAME_MS)
  }
  return farm
}

function play(options: { act: Act; frameMs: number; captureAtMs: readonly number[]; endMs: number }): Bitmap[] {
  const farm = farmFor(options.act)
  return runScript({
    frameMs: FRAME_MS,
    endMs: options.endMs,
    captureAtMs: options.captureAtMs,
    events: options.act.events(farm),
    tick: dtMs => farm.tick(dtMs),
    frame: () => farm.frame(),
  })
}

export function storyboard(): Storyboard {
  const bitmaps = ACTS.flatMap(act => play({ act, frameMs: FRAME_MS, captureAtMs: act.captureAtMs, endMs: act.endMs }))
  return { bitmaps, note: 'four seasons with ambient chores, a storm, and a harvest' }
}

export function animation(): { frameMs: number; bitmaps: Bitmap[] } {
  const frameMs = 80
  const bitmaps = ACTS.flatMap(act => {
    const captureAtMs = Array.from({ length: 50 }, (_, index) => index * frameMs)
    return play({ act, frameMs, captureAtMs, endMs: 4000 })
  })
  return { frameMs, bitmaps }
}
