import { VILLAGER_FRAMES, VILLAGER_HEIGHT } from '../art/villager'
import { setPixel, stamp } from '../shared/pixel/bitmap'
import type { Bitmap } from '../shared/pixel/bitmap'
import { FEET_Y, WALK_FRAME_MS } from '../sim/constants'
import type { Villager } from '../sim/types'
import { frameAt } from './vampire'

const DIZZY_COLORS = [0xffd166, 0xff4d6d] as const

function paceOf(villager: Villager): number {
  if (villager.state === 'fleeing') {
    return 90
  }
  return villager.state === 'dizzy' ? 170 : WALK_FRAME_MS
}

export function drawVillager(options: { bitmap: Bitmap; villager: Villager }): void {
  const { bitmap, villager } = options
  const frames = VILLAGER_FRAMES[villager.palette]
  const step = Math.floor(villager.walkMs / paceOf(villager))
  const frame = villager.state === 'bitten' ? frames[0] : frameAt({ frames, step })
  const wobble = villager.state === 'dizzy' ? Math.round(Math.sin(villager.stateMs / 120)) : 0
  const hop = villager.state === 'fleeing' && step % 2 === 1 ? 1 : 0
  const x = Math.round(villager.x) + wobble
  const top = FEET_Y - VILLAGER_HEIGHT + 1 - hop
  stamp({ target: bitmap, source: frame, x, y: top, isFlipped: villager.direction === -1 })
  if (villager.state === 'dizzy') {
    const angle = villager.stateMs / 160
    DIZZY_COLORS.forEach((color, index) => {
      const turn = angle + index * Math.PI
      setPixel({ bitmap, x: x + 2 + Math.round(Math.cos(turn) * 2), y: top - 2 + Math.round(Math.sin(turn)), color })
    })
  }
}
