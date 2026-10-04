import { FRAME_MS } from '../../plugins/night-feast/hooks/sim/constants.ts'
import { createNight } from '../../plugins/night-feast/hooks/sim/night.ts'
import type { Night } from '../../plugins/night-feast/hooks/sim/night.ts'
import type { Bitmap } from '../../shared/pixel/bitmap.ts'
import { runScript } from './script.ts'
import type { Storyboard } from './script.ts'

function scene(options: { percent: number | null; events: { atMs: number; run: (night: Night) => void }[]; captureAtMs: number[] }): Bitmap[] {
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
  const early = scene({
    percent: 22,
    events: [
      { atMs: 400, run: night => night.feed() },
      { atMs: 3200, run: night => night.feed() },
    ],
    captureAtMs: [1200, 1960, 3400, 4400],
  })
  const middle = scene({
    percent: 55,
    events: [
      { atMs: 1200, run: night => night.garlic() },
      { atMs: 3000, run: night => night.celebrate() },
    ],
    captureAtMs: [1400, 1720, 4800],
  })
  const dawn = scene({ percent: 91, events: [], captureAtMs: [1200] })
  return { bitmaps: [...early, ...middle, ...dawn], note: 'early night feeding, garlic and perch, dawn warning' }
}
