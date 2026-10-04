import type { Bitmap } from '../shared/pixel/bitmap'
import { parsePixelMap } from '../shared/pixel/sprite'
import type { DemonLook } from '../story/campaign'
import type { DemonShape } from '../sim/types'

const SHAPES: Record<DemonShape, readonly string[]> = {
  brute: [
    '....A......A....',
    '....AA....AA....',
    '.....BBBBBB.....',
    '....BBBBBBBB....',
    '....BEBBBBEB....',
    '....BBkkkkBB....',
    '.....BwkwkB.....',
    '...SBBBBBBBBS...',
    '..SSBBBBBBBBSS..',
    '..BB.BBBBBB.BB..',
    '..AA.BBSSBB.AA..',
    '.....BB..BB.....',
    '....SSS..SSS....',
  ],
  lantern: [
    '......kkkk......',
    '.....kAAAAk.....',
    '....BBBBBBBB....',
    '...BBSBBBBSBB...',
    '...BEEBBBBEEB...',
    '...BBBBBBBBBB...',
    '...BBkwkwkwkB...',
    '...BBkkkkkkkB...',
    '...BBSBBBBSBB...',
    '....BBBBBBBB....',
    '.....kAAAAk.....',
    '......A..A......',
    '.......AA.......',
  ],
  spider: [
    '................',
    '.....SBBBBS.....',
    '....BBBBBBBB....',
    '....BEBBBBEB....',
    '..S.BBAAAABB.S..',
    '.S..SBBBBBBS..S.',
    'S..SSBBBBBBSS..S',
    '..S.SBBBBBBS.S..',
    '.S..S.BBBB.S..S.',
    'S...S..BB..S...S',
    '....S......S....',
    '...S........S...',
    '...S........S...',
  ],
  lanky: [
    '......kkkk......',
    '.....kAAAAk.....',
    '......BBBB......',
    '......EBBE......',
    '......BkkB......',
    '.......BB.......',
    '....SSBBBBSS....',
    '...S.BBAABB.S...',
    '..A..BBAABB..A..',
    '.....BBAABB.....',
    '.....BB..BB.....',
    '.....BB..BB.....',
    '....SSS..SSS....',
  ],
  vase: [
    '......BBBB......',
    '.....BEBBEB.....',
    '.....BBkkBB.....',
    '......BBBB......',
    '.....wwwwww.....',
    '....SAAAAAAS....',
    '...SAABAABAAS...',
    '...SAAAAAAAAS...',
    '...SAABAABAAS...',
    '....SAAAAAAS....',
    '.....SAAAAS.....',
    '......SSSS......',
    '................',
  ],
  moon: [
    '.....kkkkkk.....',
    '....kkkkkkkk....',
    '....kBBBBBBk....',
    '....kEBBBBEk....',
    '....kBBkkBBk....',
    '.....BBBBBB.....',
    '...SSSAAAASSS...',
    '..SSSSSAASSSSS..',
    '..BB.SSSSSS.BB..',
    '..BB.SSSSSS.BB..',
    '.....SSSSSS.....',
    '.....SS..SS.....',
    '....kkk..kkk....',
  ],
  muzan: [
    '.....kkkkkk.....',
    '.....kkkkkk.....',
    '...kkrrrrrrkk...',
    '...kkkkkkkkkk...',
    '.....kAAAAk.....',
    '.....kEAAEk.....',
    '.....kAAAAk.....',
    '......AAAA......',
    '....BBwrrwBB....',
    '...BBBwrrwBBB...',
    '...BB.BBBB.BB...',
    '.....BB..BB.....',
    '....kkk..kkk....',
  ],
}

const cache = new Map<string, Bitmap>()

export function demonSprite(options: { shape: DemonShape; look: DemonLook }): Bitmap {
  const { shape, look } = options
  const key = `${shape}:${look.body}:${look.accent}:${look.eye}`
  const cached = cache.get(key)
  if (cached) {
    return cached
  }
  const bitmap = parsePixelMap({
    rows: SHAPES[shape],
    palette: { B: look.body, S: look.shade, A: look.accent, E: look.eye, k: 0x0b0b0b, w: 0xf8f9fa, r: 0x8b0000 },
  })
  cache.set(key, bitmap)
  return bitmap
}
