import type { Bitmap } from '../../shared/pixel/bitmap.ts'
import { FRAME_MS } from '../../plugins/pocket-familiar/hooks/sim/constants.ts'
import { createFamiliar } from '../../plugins/pocket-familiar/hooks/sim/familiar.ts'
import type { Familiar } from '../../plugins/pocket-familiar/hooks/sim/familiar.ts'
import type { Storyboard } from './script.ts'

type Scene = { xp: number; hour: number; settleMs: number; act: (familiar: Familiar) => void }

function snapshot(bitmap: Bitmap): Bitmap {
  return { ...bitmap, pixels: [...bitmap.pixels] }
}

function render(scene: Scene): Bitmap {
  const familiar = createFamiliar()
  familiar.restore({ saved: { fullness: 80, joy: 75, energy: 60, lifetimeXp: scene.xp, lastSeenAt: 0 }, now: 0 })
  familiar.setHour(scene.hour)
  scene.act(familiar)
  for (let elapsed = 0; elapsed < scene.settleMs; elapsed += FRAME_MS) {
    familiar.tick({ dtMs: FRAME_MS })
  }
  return snapshot(familiar.frame())
}

const SCENES: readonly Scene[] = [
  { xp: 17, hour: 22, settleMs: 1200, act: () => undefined },
  { xp: 60, hour: 10, settleMs: 400, act: familiar => familiar.toolStarted('read') },
  { xp: 150, hour: 13, settleMs: 400, act: familiar => familiar.toolStarted('edit') },
  {
    xp: 640,
    hour: 18.4,
    settleMs: 300,
    act: familiar => {
      familiar.toolStarted('test')
      familiar.toolFinished({ kind: 'test', isFailure: false, isCreation: false })
      familiar.toolStarted('test')
    },
  },
  { xp: 2300, hour: 23, settleMs: 900, act: familiar => familiar.turnStarted() },
  { xp: 6000, hour: 2, settleMs: 5 * 60 * 1000 + 1200, act: () => undefined },
  {
    xp: 350,
    hour: 15,
    settleMs: 500,
    act: familiar => {
      ;[1, 2, 3].forEach(() => {
        familiar.toolStarted('other')
        familiar.toolFinished({ kind: 'other', isFailure: true, isCreation: false })
      })
    },
  },
  {
    xp: 119,
    hour: 9,
    settleMs: 200,
    act: familiar => {
      familiar.turnStarted()
      familiar.turnCompleted({ isSuccess: true })
    },
  },
  { xp: 1200, hour: 6.3, settleMs: 600, act: familiar => familiar.toolStarted('read') },
]

export function storyboard(): Storyboard {
  return { bitmaps: SCENES.map(render), note: 'egg, kit, fox at 1, 3, 6, and 9 tails, duck, evolution, dawn' }
}
