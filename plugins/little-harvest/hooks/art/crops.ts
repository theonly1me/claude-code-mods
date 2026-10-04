import type { Bitmap, Color } from '../shared/pixel/bitmap'
import { parsePixelMap } from '../shared/pixel/sprite'
import type { CropKind, GrowthStage } from '../sim/types'

const PALETTE: Readonly<Record<string, Color>> = {
  g: 0x5fae3e,
  G: 0x3d7a2a,
  l: 0x9be564,
  L: 0xa6d86a,
  y: 0xf7d038,
  Y: 0xe8a920,
  t: 0xd9b26a,
  o: 0xf08a24,
  O: 0xc9631a,
  s: 0x6b4a2a,
  b: 0x6b3b1f,
  r: 0xe2435c,
  R: 0xa82a44,
  w: 0xf0d277,
  W: 0xc9a040,
  k: 0xefe1b0,
}

const SEED = ['.k...', '..k.k']
const SPROUT = ['.l.l.', '..G..', '..G..']

const GROWING: Record<CropKind, readonly string[]> = {
  corn: ['..l..', '.gG..', '..Gg.', '.gG..', '..G..'],
  pumpkin: ['.g.g.', 'gGgGg', '.LLg.'],
  sunflower: ['.lgl.', '..G..', '.gG..', '..Gg.', '..G..'],
  tulip: ['..g..', '.gGg.', '..G..', '.gG..'],
  wheat: ['g.g.g', 'G.G.G', '.GGG.', '..G..'],
  carrot: ['g.l.g', '.gGg.', '..G..'],
}

const RIPE: Record<CropKind, readonly string[]> = {
  corn: ['..t..', '.tGt.', '.gGY.', '..GYy', '.gGY.', '..Gg.', '..G..'],
  pumpkin: ['..sg.', '.oOo.', 'oOoOo', 'oOoOo', '.oOo.'],
  sunflower: ['.yYy.', 'ybbby', 'Ybbby', '.yYy.', '..G..', '.gG..', '..Gg.', '..G..'],
  tulip: ['.r.r.', '.rRr.', '.rrr.', '..G..', '.gGl.', '..G..'],
  wheat: ['w.w.w', 'WwWwW', 'w.w.w', '.W.W.', '.W.W.', '..W..'],
  carrot: ['g.l.g', 'lgGgl', '.gGg.', '.oOo.'],
}

function build(rows: readonly string[]): Bitmap {
  return parsePixelMap({ rows, palette: PALETTE })
}

const SPRITES: Record<CropKind, Record<GrowthStage, Bitmap>> = {
  corn: { seed: build(SEED), sprout: build(SPROUT), growing: build(GROWING.corn), ripe: build(RIPE.corn) },
  pumpkin: { seed: build(SEED), sprout: build(SPROUT), growing: build(GROWING.pumpkin), ripe: build(RIPE.pumpkin) },
  sunflower: { seed: build(SEED), sprout: build(SPROUT), growing: build(GROWING.sunflower), ripe: build(RIPE.sunflower) },
  tulip: { seed: build(SEED), sprout: build(SPROUT), growing: build(GROWING.tulip), ripe: build(RIPE.tulip) },
  wheat: { seed: build(SEED), sprout: build(SPROUT), growing: build(GROWING.wheat), ripe: build(RIPE.wheat) },
  carrot: { seed: build(SEED), sprout: build(SPROUT), growing: build(GROWING.carrot), ripe: build(RIPE.carrot) },
}

export function cropSprite(options: { crop: CropKind; stage: GrowthStage }): Bitmap {
  return SPRITES[options.crop][options.stage]
}
