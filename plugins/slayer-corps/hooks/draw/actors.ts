import { BLADE_COLORS, slayerSprite } from '../art/slayers'
import { setPixel, stamp } from '../shared/pixel/bitmap'
import type { Bitmap } from '../shared/pixel/bitmap'
import { toRadians } from '../shared/pixel/colors'
import { drawGlyphRows } from '../shared/pixel/font'
import { DOZE_AFTER_MS, GROUND_TOP, SLAYER_HEIGHT, STRIKE_MS } from '../sim/constants'
import type { Actor, AttackKind } from '../sim/types'

const Z_ROWS = ['###', '.#.', '###']
const BOLT_COLORS = [0xffffff, 0xffd60a]

function drawBlade(options: { bitmap: Bitmap; actor: Actor; x: number; y: number }): void {
  const { actor } = options
  if (actor.mode !== 'strike' || actor.name === 'nezuko') {
    return
  }
  const progress = Math.min(1, actor.modeMs / STRIKE_MS)
  const radians = toRadians(-70 + progress * 120)
  const handX = options.x + 6
  const handY = options.y + 7
  for (let step = 1; step <= 6; step += 1) {
    setPixel({
      bitmap: options.bitmap,
      x: handX + Math.cos(radians) * step,
      y: handY + Math.sin(radians) * step,
      color: step === 6 ? 0xffffff : BLADE_COLORS[actor.name],
    })
  }
}

const ARCS: Partial<Record<AttackKind, { radius: number; colors: readonly number[] }>> = {
  water: { radius: 6, colors: [0xffffff, 0x90e0ef, 0x00b4d8, 0x0077b6] },
  sun: { radius: 8, colors: [0xfff3b0, 0xffba08, 0xe85d04, 0x9d0208] },
  blaze: { radius: 7, colors: [0xffd166, 0xf77f00, 0xd62828, 0x6a040f] },
}

function drawFormArc(options: { bitmap: Bitmap; actor: Actor; x: number; y: number }): void {
  const { actor } = options
  const arc = actor.attack ? ARCS[actor.attack.kind] : undefined
  if (!arc || actor.mode !== 'strike') {
    return
  }
  const progress = Math.min(1, actor.modeMs / STRIKE_MS)
  const sweepEnd = -110 + progress * 220
  const sweepStart = Math.max(-110, sweepEnd - 140)
  for (let degrees = sweepStart; degrees <= sweepEnd; degrees += 6) {
    const radians = toRadians(degrees)
    arc.colors.forEach((color, layer) => {
      const radius = arc.radius - layer + 1
      setPixel({
        bitmap: options.bitmap,
        x: options.x + 5 + Math.cos(radians) * radius,
        y: options.y + 6 + Math.sin(radians) * radius,
        color,
      })
    })
  }
}

function drawBolt(options: { bitmap: Bitmap; actor: Actor; y: number }): void {
  const { actor } = options
  if (actor.attack?.kind !== 'thunder' || actor.mode !== 'strike' || actor.modeMs > 220) {
    return
  }
  const from = Math.round(actor.homeX + 3)
  const to = Math.round(actor.x)
  for (let x = from; x <= to; x += 1) {
    const zig = (Math.floor(x / 3) % 2 === 0 ? -1 : 1) * (x % 3)
    setPixel({ bitmap: options.bitmap, x, y: options.y + 6 + zig, color: BOLT_COLORS[x % 2] ?? 0xffffff })
  }
}

function drawDoze(options: { bitmap: Bitmap; x: number; y: number; clockMs: number }): void {
  const rise = Math.floor(options.clockMs / 260) % 6
  drawGlyphRows({ bitmap: options.bitmap, rows: Z_ROWS, x: options.x + 6, y: options.y - 1 - rise, color: 0xdee2e6 })
}

export function drawActors(options: { bitmap: Bitmap; actors: readonly Actor[]; clockMs: number; idleMs: number; isCelebrating: boolean }): void {
  const { bitmap, clockMs } = options
  const ordered = [...options.actors].sort((first, second) => Number(first.mode !== 'home') - Number(second.mode !== 'home'))
  ordered.forEach(actor => {
    if (actor.mode === 'offstage') {
      return
    }
    const isMoving = actor.mode === 'dash' || actor.mode === 'return'
    const isDozing = actor.name === 'zenitsu' && actor.mode === 'home' && options.idleMs > DOZE_AFTER_MS
    const sprite = slayerSprite({ name: actor.name, isStriding: isMoving && Math.floor(clockMs / 110) % 2 === 0, isDozing })
    const isStaggered = actor.mode === 'stagger'
    const x = Math.round(actor.x) - (isStaggered ? 2 : 0)
    const hop = options.isCelebrating ? Math.round(Math.abs(Math.sin(clockMs / 170 + actor.homeX)) * 3) : 0
    const y = GROUND_TOP - SLAYER_HEIGHT - actor.lift - hop
    const isFlashing = isStaggered && Math.floor(actor.modeMs / 70) % 2 === 0
    stamp({ target: bitmap, source: sprite, x, y, tint: isFlashing ? () => 0xffffff : undefined })
    drawFormArc({ bitmap, actor, x, y })
    drawBlade({ bitmap, actor, x, y })
    drawBolt({ bitmap, actor, y })
    if (isDozing) {
      drawDoze({ bitmap, x, y, clockMs })
    }
  })
}
