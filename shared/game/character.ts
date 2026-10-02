import type { Bitmap } from '../render/bitmap'
import { drawSprite } from '../art'
import type { Sprite } from '../art'
import type { Game } from './model'

const vampire: Sprite = [
  '....bbbb....',
  '...bbhhbb...',
  '...hehheh...',
  '...hwbbwh...',
  '.v..hhhh..v.',
  '.vvbbrrbbvv.',
  'vvvbbrrbbvvv',
  'vvvbbbbbbvvv',
  '.vvbb..bbvv.',
  '..vbb..bbv..',
]

const flutteringVampire: Sprite = [
  ...vampire.slice(0, 6),
  '.vvbbrrbbvvv',
  'vvvbbbbbbvv.',
  ...vampire.slice(8),
]

const jumpingVampire: Sprite = [
  ...vampire.slice(0, 5),
  'vvvbbrrbbvvv',
  'vvvbbrrbbvvv',
  '.vvbbbbbbvv.',
  '..vbb..bbv..',
  '...bb..bb...',
]

const feedingVampire: Sprite = [
  ...vampire.slice(0, 3),
  '....hwwh....',
  ...vampire.slice(4, 5),
  '.vvbbrrbbha.',
  'vvvbbrrbbvv.',
  ...vampire.slice(7),
]

export function drawVampire(options: { bitmap: Bitmap; game: Game; tick: number; camera: number; ground: number; scale: number }): void {
  const { bitmap, game, tick, camera, ground, scale } = options
  const sprite = game.feeding !== null ? feedingVampire : !game.grounded ? jumpingVampire : tick % 6 < 3 ? flutteringVampire : vampire
  const fitted = bitmap.height < 13 ? [...sprite.slice(0, 6), ...sprite.slice(8)] : sprite
  drawSprite({ bitmap, sprite: fitted, x: (game.x - camera - 3) * scale, y: ground - (16 + fitted.length - game.y) * scale, scale, flipped: game.direction < 0 })
}
