import { FRAME_MS } from '../../plugins/night-feast/hooks/sim/constants.ts'
import { createNight } from '../../plugins/night-feast/hooks/sim/night.ts'
import type { Night } from '../../plugins/night-feast/hooks/sim/night.ts'
import type { Bitmap } from '../../shared/pixel/bitmap.ts'
import { runScript } from './script.ts'
import type { Storyboard } from './script.ts'

type NightEvent = { atMs: number; run: (night: Night) => void }

function scene(options: { percent: number | null; events: NightEvent[]; captureAtMs: number[] }): Bitmap[] {
  const night = createNight()
  night.measure(options.percent)
  return runScript({
    frameMs: FRAME_MS,
    endMs: Math.max(...options.captureAtMs),
    captureAtMs: options.captureAtMs,
    events: options.events.map(event => ({ atMs: event.atMs, run: () => event.run(night) })),
    tick: dtMs => night.tick({ dtMs }),
    frame: () => night.frame(),
  })
}

export function storyboard(): Storyboard {
  const ambient = scene({
    percent: 35,
    events: [],
    captureAtMs: [2480, 7400, 13600, 18400, 19400, 22800, 25400, 31600],
  })
  const work = scene({
    percent: 62,
    events: [
      { atMs: 400, run: night => night.feed('Read') },
      { atMs: 2800, run: night => night.garlic('Bash') },
      { atMs: 4400, run: night => night.celebrate() },
    ],
    captureAtMs: [1240, 1480, 3000, 6400],
  })
  return {
    bitmaps: [...ambient, ...work],
    note: 'stalk, swoop, ambush with the cat on the roofs, pounce, door slam, owl, shadows, tower and moon bats, then a feed, garlic, and the cape',
  }
}

export function animation(): { frameMs: number; bitmaps: Bitmap[] } {
  const frameMs = 80
  const captureAtMs = Array.from({ length: 150 }, (_, index) => 400 + index * frameMs)
  const bitmaps = scene({
    percent: 48,
    events: [
      { atMs: 3200, run: night => night.feed('Read') },
      { atMs: 8800, run: night => night.feed('Edit') },
    ],
    captureAtMs,
  })
  return { frameMs, bitmaps }
}
