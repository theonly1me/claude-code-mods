import { clearBitmap, createBitmap } from '../../shared/pixel/bitmap'
import type { Bitmap } from '../../shared/pixel/bitmap'
import type { ThemeName } from '../themes'
import { SCENE_HEIGHT } from './paint'
import { drawPunk } from './punk'
import { drawRetro } from './retro'
import { drawSynthwave } from './synthwave'
import { drawZen } from './zen'

export { SCENE_HEIGHT }

const DRAWERS = { retro: drawRetro, punk: drawPunk, synthwave: drawSynthwave, zen: drawZen } as const

export function createSceneBitmap(width: number): Bitmap {
  return createBitmap({ width, height: SCENE_HEIGHT })
}

export function paintScene(options: { bitmap: Bitmap; name: ThemeName; ms: number; isWorking: boolean; isLight: boolean }): Bitmap {
  clearBitmap(options.bitmap)
  DRAWERS[options.name]({ bitmap: options.bitmap, ms: options.ms, isWorking: options.isWorking, isLight: options.isLight })
  return options.bitmap
}
