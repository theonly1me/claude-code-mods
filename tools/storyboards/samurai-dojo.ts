import type { Bitmap } from '../../shared/pixel/bitmap.ts'
import { startOfSeason } from '../../shared/pixel/seasons.ts'
import type { SeasonName } from '../../shared/pixel/seasons.ts'
import { FRAME_MS } from '../../plugins/samurai-dojo/hooks/sim/constants.ts'
import { createDojo } from '../../plugins/samurai-dojo/hooks/sim/dojo.ts'
import type { Storyboard } from './script.ts'

type Segment = { season: SeasonName; seed: number; captureAtMs: readonly number[] }

const COLUMNS = 62
const WORK_AT_MS = 9000

const SHEET: readonly Segment[] = [
  { season: 'winter', seed: 2, captureAtMs: [3000, 10400, 14000] },
  { season: 'blossom', seed: 2, captureAtMs: [1800, 9440, 10240] },
  { season: 'autumn', seed: 3, captureAtMs: [2600, 8000, 13600] },
]

const ANIMATION: readonly { season: SeasonName; seed: number; fromMs: number }[] = [
  { season: 'winter', seed: 2, fromMs: 2000 },
  { season: 'blossom', seed: 2, fromMs: 800 },
  { season: 'summer', seed: 3, fromMs: 9400 },
  { season: 'autumn', seed: 1, fromMs: 1200 },
]

function snapshot(bitmap: Bitmap): Bitmap {
  return { ...bitmap, pixels: [...bitmap.pixels] }
}

function run(options: {
  season: SeasonName
  seed: number
  endMs: number
  shouldCapture: (elapsedMs: number) => boolean
}): { bitmaps: Bitmap[]; log: readonly string[] } {
  const dojo = createDojo({ seed: options.seed })
  dojo.restore({ tally: { codex: 4, gemini: 3, chatgpt: 5 }, lifetimeKills: 540 })
  dojo.begin(startOfSeason({ name: options.season }) + 30000)
  dojo.resize(COLUMNS)
  const bitmaps: Bitmap[] = []
  let workIds: number[] = []
  for (let elapsedMs = 0; elapsedMs <= options.endMs; elapsedMs += FRAME_MS) {
    if (elapsedMs === WORK_AT_MS) {
      workIds = [dojo.spawn({ isElite: false, label: 'Read' }), dojo.spawn({ isElite: false, label: 'Edit' })]
    }
    if (elapsedMs === WORK_AT_MS + 1200) {
      workIds.forEach(id => dojo.defeat({ id, isFailure: false }))
    }
    dojo.tick({ dtMs: FRAME_MS })
    if (options.shouldCapture(elapsedMs)) {
      bitmaps.push(snapshot(dojo.frame()))
    }
  }
  return { bitmaps, log: dojo.log() }
}

export function storyboard(): Storyboard {
  const runs = SHEET.map(segment =>
    run({
      season: segment.season,
      seed: segment.seed,
      endMs: Math.max(...segment.captureAtMs),
      shouldCapture: elapsedMs => segment.captureAtMs.includes(elapsedMs),
    }),
  )
  return {
    bitmaps: runs.flatMap(result => result.bitmaps),
    note: runs.map(result => [...result.log].reverse().join(' | ')).join(' || '),
  }
}

export function animation(): { frameMs: number; bitmaps: Bitmap[] } {
  const frameMs = 80
  const segmentMs = 4000
  return {
    frameMs,
    bitmaps: ANIMATION.flatMap(segment =>
      run({
        season: segment.season,
        seed: segment.seed,
        endMs: segment.fromMs + segmentMs,
        shouldCapture: elapsedMs => elapsedMs >= segment.fromMs && (elapsedMs - segment.fromMs) % frameMs === 0,
      }).bitmaps,
    ),
  }
}
