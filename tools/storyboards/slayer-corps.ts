import type { Bitmap } from '../../shared/pixel/bitmap.ts'
import { FRAME_MS } from '../../plugins/slayer-corps/hooks/sim/constants.ts'
import { createBattle } from '../../plugins/slayer-corps/hooks/sim/battle.ts'
import type { Battle } from '../../plugins/slayer-corps/hooks/sim/battle.ts'
import { freshProgress } from '../../plugins/slayer-corps/hooks/story/progress.ts'
import type { Storyboard } from './script.ts'

type Cue = { atMs: number; run: (battle: Battle) => void }

const ANIMATION_FRAME_MS = 80
const ANIMATION_END_MS = 12000

const WORK_CUES: readonly Cue[] = [
  { atMs: 3200, run: battle => battle.strike({ tool: 'Read', isFailure: false }) },
  { atMs: 6400, run: battle => battle.strike({ tool: 'Edit', isFailure: false }) },
  { atMs: 9200, run: battle => battle.strike({ tool: 'Bash', isFailure: false }) },
]

function snapshot(bitmap: Bitmap): Bitmap {
  return { ...bitmap, pixels: [...bitmap.pixels] }
}

function startedBattle(): Battle {
  const battle = createBattle()
  battle.restore({ ...freshProgress(), chapter: 3, demonHp: 70 })
  return battle
}

function momentKey(battle: Battle): string | undefined {
  const mover = battle.actors().find(actor => {
    if (actor.mode === 'strike') {
      return actor.modeMs >= 120 && actor.modeMs < 160
    }
    if (actor.mode === 'hop') {
      return actor.modeMs >= 280 && actor.modeMs < 320
    }
    return actor.mode === 'doze' && actor.modeMs >= 600 && actor.modeMs < 640
  })
  return mover ? `${mover.name}:${mover.mode}:${mover.attack?.style ?? ''}` : undefined
}

export function storyboard(): Storyboard {
  const battle = startedBattle()
  const seen = new Set<string>()
  const bitmaps: Bitmap[] = []
  const cues = [...WORK_CUES, { atMs: 11600, run: (current: Battle) => current.finish() }]
  for (let elapsedMs = 0; elapsedMs <= 20000 && bitmaps.length < 9; elapsedMs += FRAME_MS) {
    cues.filter(cue => cue.atMs === elapsedMs).forEach(cue => cue.run(battle))
    battle.tick(FRAME_MS)
    const key = momentKey(battle)
    if (key && !seen.has(key)) {
      seen.add(key)
      bitmaps.push(snapshot(battle.frame()))
    }
  }
  return { bitmaps, note: `moments ${[...seen].join(', ')}` }
}

export function animation(): { frameMs: number; bitmaps: Bitmap[] } {
  const battle = startedBattle()
  const bitmaps: Bitmap[] = []
  for (let elapsedMs = 0; elapsedMs < ANIMATION_END_MS; elapsedMs += FRAME_MS) {
    WORK_CUES.filter(cue => cue.atMs === elapsedMs).forEach(cue => cue.run(battle))
    battle.tick(FRAME_MS)
    if (elapsedMs % ANIMATION_FRAME_MS === 0) {
      bitmaps.push(snapshot(battle.frame()))
    }
  }
  return { frameMs: ANIMATION_FRAME_MS, bitmaps }
}
