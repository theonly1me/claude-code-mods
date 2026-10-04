import type { Bitmap } from '../shared/pixel/bitmap'
import { parsePixelMap, replaceRows } from '../shared/pixel/sprite'
import type { SlayerName } from '../sim/types'

const STAND_LEGS = ['.uu.uu.', '.uu.uu.', '.ll.ll.']
const STRIDE_LEGS = ['.uu..u.', 'uu...uu', 'll...ll']

const TANJIRO = {
  palette: { h: 0x7b2d26, H: 0xa83c32, s: 0xf2c9a0, e: 0x4a1c1c, g: 0x2d6a4f, k: 0x1b1b1b, b: 0xe9ecef, w: 0xf8f9fa, u: 0x1f2833, l: 0x0d1117, c: 0xc0392b },
  rows: ['..hhh..', '.hHhhh.', 'whsssh.', '.cesesh', '..sss..', '.gkgkg.', 'gkgkgkg', 'kgbbbgk', '.gkgkg.'],
}

const NEZUKO = {
  palette: { k: 0x1a1a1a, o: 0xe76f51, r: 0xff85a1, s: 0xf6d5c5, e: 0xff70a6, m: 0xa7c957, p: 0xf4acb7, P: 0xd63384, u: 0xf6d5c5, l: 0xf8f9fa },
  rows: ['..kkkr.', '.kkkkk.', '.ksssk.', '.kesek.', '.kmmmk.', 'okpppko', 'opPpPpo', 'opPpPpo', '.ppppp.'],
}

const ZENITSU = {
  palette: { y: 0xffd43b, Y: 0xf9c80e, s: 0xf5d0a9, e: 0x8a5a00, w: 0xffffff, b: 0xe9ecef, u: 0x1f2833, l: 0x0d1117, d: 0xc9a227 },
  rows: ['.y.y.y.', 'yyyyyyy', '.ysssy.', '.seses.', '..sss..', '.YwYwY.', 'YwYwYwY', 'YYbbbYY', '.YwYwY.'],
}

const INOSUKE = {
  palette: { G: 0x868e96, D: 0x495057, k: 0x111111, n: 0xced4da, W: 0xffffff, s: 0xe0ac69, S: 0xc68b59, F: 0x8d6e63, u: 0x495057, l: 0x212529 },
  rows: ['.GG.GG.', 'GGGGGGG', 'GkGGGkG', 'GDnnnDG', '.WnnnW.', 'sSsssSs', '.sSsSs.', '.sssss.', 'FFFFFFF'],
}

const HASHIRA = {
  palette: { r: 0xd62828, Y: 0xffba08, s: 0xf2c9a0, O: 0xe85d04, w: 0xf8f9fa, k: 0x1b1b1b, b: 0xe9ecef, o: 0xf48c06, R: 0xdc2f02, u: 0x1b1b1b, l: 0x0d1117 },
  rows: ['.r.r.r.', 'rYYYYYr', '.YsssY.', '.sOsOs.', '..sss..', 'wwkkkww', 'wwkkkww', 'wwbbbww', 'oRoRoRo'],
}

const SPRITES = { tanjiro: TANJIRO, nezuko: NEZUKO, zenitsu: ZENITSU, inosuke: INOSUKE, hashira: HASHIRA }

function build(options: { name: SlayerName; legs: readonly string[] }): Bitmap {
  const sprite = SPRITES[options.name]
  return parsePixelMap({ rows: [...sprite.rows, ...options.legs], palette: sprite.palette })
}

const STANDING: Record<SlayerName, Bitmap> = {
  tanjiro: build({ name: 'tanjiro', legs: STAND_LEGS }),
  nezuko: build({ name: 'nezuko', legs: STAND_LEGS }),
  zenitsu: build({ name: 'zenitsu', legs: STAND_LEGS }),
  inosuke: build({ name: 'inosuke', legs: STAND_LEGS }),
  hashira: build({ name: 'hashira', legs: STAND_LEGS }),
}

const STRIDING: Record<SlayerName, Bitmap> = {
  tanjiro: build({ name: 'tanjiro', legs: STRIDE_LEGS }),
  nezuko: build({ name: 'nezuko', legs: STRIDE_LEGS }),
  zenitsu: build({ name: 'zenitsu', legs: STRIDE_LEGS }),
  inosuke: build({ name: 'inosuke', legs: STRIDE_LEGS }),
  hashira: build({ name: 'hashira', legs: STRIDE_LEGS }),
}

const DOZING_ZENITSU = parsePixelMap({
  rows: [...replaceRows({ rows: ZENITSU.rows, replacements: { '.seses.': '.sdsds.' } }), ...STAND_LEGS],
  palette: ZENITSU.palette,
})

export function slayerSprite(options: { name: SlayerName; isStriding: boolean; isDozing: boolean }): Bitmap {
  if (options.name === 'zenitsu' && options.isDozing) {
    return DOZING_ZENITSU
  }
  return options.isStriding ? STRIDING[options.name] : STANDING[options.name]
}

export const BLADE_COLORS: Record<SlayerName, number> = {
  tanjiro: 0x1b1b1b,
  nezuko: 0xff4d6d,
  zenitsu: 0xffd60a,
  inosuke: 0xadb5bd,
  hashira: 0xe85d04,
}
