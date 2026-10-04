import type { Bitmap } from '../../shared/pixel/bitmap.ts'
import { createSceneBitmap, paintScene } from '../../plugins/looks/hooks/looks/scene/index.ts'
import type { ThemeName } from '../../plugins/looks/hooks/looks/themes.ts'
import type { Storyboard } from './script.ts'

const NAMES: readonly ThemeName[] = ['synthwave', 'retro', 'punk', 'zen']
const WIDTH = 100

function snapshot(bitmap: Bitmap): Bitmap {
  return { ...bitmap, pixels: [...bitmap.pixels] }
}

function frame(options: { name: ThemeName; ms: number; isWorking: boolean; isLight: boolean }): Bitmap {
  return snapshot(paintScene({ bitmap: createSceneBitmap(WIDTH), ...options }))
}

export function storyboard(): Storyboard {
  const bitmaps = NAMES.flatMap(name => [
    frame({ name, ms: 1200, isWorking: false, isLight: false }),
    frame({ name, ms: 2300, isWorking: true, isLight: false }),
    frame({ name, ms: 2300, isWorking: true, isLight: true }),
  ])
  return { bitmaps, note: 'four themes, each idle, working, and working on a light terminal' }
}

export function animation(): { frameMs: number; bitmaps: Bitmap[] } {
  const frameMs = 100
  return { frameMs, bitmaps: NAMES.flatMap(name => Array.from({ length: 40 }, (_, index) => frame({ name, ms: index * frameMs, isWorking: true, isLight: false }))) }
}
