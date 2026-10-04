import { parsePixelMap, replaceRows } from '../shared/pixel/sprite'
import type { Bitmap, Color } from '../shared/pixel/bitmap'

export const FUR: Color = 0xe8833a
export const FUR_SHADE: Color = 0xc4622a
export const CREAM: Color = 0xf7e9d2
export const INK: Color = 0x2b1d14
export const TAIL_OUTLINE: Color = 0x8f4219

const PALETTE = {
  O: FUR,
  o: FUR_SHADE,
  c: CREAM,
  d: 0xe2cdab,
  k: INK,
  w: 0xffffff,
  p: 0xf4a3a8,
} as const

const FOX_EYES_OPEN = ['OOkwOOOkwOO', 'OOkkOOOkkOO']
const FOX_EYES_SHUT = ['OOOOOOOOOOO', 'OOkkOOOkkOO']
const FOX_EYES_HAPPY = ['OOOkOOOkOOO', 'OOkOkOkOkOO']

const FOX_ROWS = [
  '.k.......k.',
  '.Oc.....cO.',
  '.OOO...OOO.',
  'OOOOOOOOOOO',
  ...FOX_EYES_OPEN,
  'cpOOOkOOOpc',
  '.ccccccccc.',
  '..OcccccO..',
  '..OcccccO..',
  '..oOcccOo..',
  '..kk...kk..',
]

const KIT_ROWS = [
  '.k.....k.',
  '.Oc...cO.',
  'OOOOOOOOO',
  'OkwOOOkwO',
  'OkkOOOkkO',
  'cpOOkOOpc',
  '.ccccccc.',
  '..kk.kk..',
]

const EGG_ROWS = [
  '..ccc..',
  '.cccOd.',
  '.cOcccd',
  'ccccOcd',
  'cOccccd',
  'cccOccd',
  'ccccccd',
  '.cOccd.',
  '..cdd..',
]

export type EyeState = 'open' | 'shut' | 'happy'

function foxEyes(eyes: EyeState): readonly string[] {
  if (eyes === 'happy') {
    return FOX_EYES_HAPPY
  }
  return eyes === 'shut' ? FOX_EYES_SHUT : FOX_EYES_OPEN
}

function foxWithEyes(eyes: EyeState): Bitmap {
  const [upper = '', lower = ''] = foxEyes(eyes)
  const rows = FOX_ROWS.map((row, index) => (index === 4 ? upper : index === 5 ? lower : row))
  return parsePixelMap({ rows, palette: PALETTE })
}

const FOX_FRAMES: Record<EyeState, Bitmap> = {
  open: foxWithEyes('open'),
  shut: foxWithEyes('shut'),
  happy: foxWithEyes('happy'),
}

const KIT_OPEN = parsePixelMap({ rows: KIT_ROWS, palette: PALETTE })
const KIT_SHUT = parsePixelMap({
  rows: replaceRows({ rows: KIT_ROWS, replacements: { OkwOOOkwO: 'OOOOOOOOO' } }),
  palette: PALETTE,
})

export const EGG = parsePixelMap({ rows: EGG_ROWS, palette: PALETTE })

export function foxSprite(eyes: EyeState): Bitmap {
  return FOX_FRAMES[eyes]
}

export function kitSprite(eyes: EyeState): Bitmap {
  return eyes === 'open' ? KIT_OPEN : KIT_SHUT
}

export const EGG_CRACKS: readonly (readonly { x: number; y: number }[])[] = [
  [
    { x: 2, y: 3 },
    { x: 3, y: 4 },
    { x: 2, y: 5 },
  ],
  [
    { x: 4, y: 2 },
    { x: 5, y: 3 },
    { x: 4, y: 4 },
    { x: 3, y: 1 },
  ],
]
