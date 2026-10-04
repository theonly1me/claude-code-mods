import type { Bitmap } from '../../shared/pixel/bitmap.ts'
import { FRAME_MS } from '../../plugins/pocket-familiar/hooks/sim/constants.ts'
import { createFamiliar } from '../../plugins/pocket-familiar/hooks/sim/familiar.ts'
import type { Familiar } from '../../plugins/pocket-familiar/hooks/sim/familiar.ts'
import type { Storyboard } from './script.ts'

type Scene = { xp: number; hour: number; settleMs: number; act: (familiar: Familiar) => void }

type ScriptedEvent = { atMs: number; run: (familiar: Familiar) => void }

const ANIMATION_FRAME_MS = 80
const ANIMATION_MS = 12000

function snapshot(bitmap: Bitmap): Bitmap {
  return { ...bitmap, pixels: [...bitmap.pixels] }
}

function familiarAt(options: { xp: number; hour: number }): Familiar {
  const familiar = createFamiliar()
  familiar.restore({ saved: { fullness: 80, joy: 75, energy: 60, lifetimeXp: options.xp, lastSeenAt: 0 }, now: 0 })
  familiar.setHour(options.hour)
  familiar.begin(7)
  return familiar
}

function render(scene: Scene): Bitmap {
  const familiar = familiarAt(scene)
  scene.act(familiar)
  for (let elapsed = 0; elapsed < scene.settleMs; elapsed += FRAME_MS) {
    familiar.tick({ dtMs: FRAME_MS })
  }
  return snapshot(familiar.frame())
}

const SCENES: readonly Scene[] = [
  { xp: 640, hour: 10, settleMs: 2600, act: familiar => familiar.play('butterfly') },
  { xp: 350, hour: 16, settleMs: 1500, act: familiar => familiar.play('leaf') },
  { xp: 60, hour: 13, settleMs: 1300, act: familiar => familiar.play('yarn') },
  { xp: 2300, hour: 18.2, settleMs: 1500, act: familiar => familiar.play('tail') },
  { xp: 300, hour: 11, settleMs: 4200, act: familiar => familiar.play('dig') },
  { xp: 6000, hour: 23, settleMs: 1200, act: familiar => familiar.play('stars') },
  { xp: 150, hour: 21, settleMs: 1500, act: familiar => familiar.play('nap') },
  { xp: 1000, hour: 14, settleMs: 400, act: familiar => familiar.toolStarted('edit') },
  {
    xp: 60,
    hour: 9,
    settleMs: 300,
    act: familiar => {
      familiar.toolStarted('test')
      familiar.toolFinished({ kind: 'test', isFailure: false, isCreation: false })
    },
  },
]

export function storyboard(): Storyboard {
  return {
    bitmaps: SCENES.map(render),
    note: 'butterfly, leaf pounce, yarn, tail chase, pebble, shooting star, nap, typing with Claude, fed by tests',
  }
}

const ANIMATION_EVENTS: readonly ScriptedEvent[] = [
  { atMs: 0, run: familiar => familiar.play('butterfly') },
  { atMs: 3800, run: familiar => familiar.turnStarted() },
  { atMs: 4000, run: familiar => familiar.toolStarted('read') },
  {
    atMs: 5200,
    run: familiar => {
      familiar.toolFinished({ kind: 'read', isFailure: false, isCreation: false })
      familiar.toolStarted('test')
    },
  },
  { atMs: 6400, run: familiar => familiar.toolFinished({ kind: 'test', isFailure: false, isCreation: false }) },
  { atMs: 6600, run: familiar => familiar.turnCompleted({ isSuccess: true }) },
  { atMs: 8400, run: familiar => familiar.play('leaf') },
]

export function animation(): { frameMs: number; bitmaps: Bitmap[] } {
  const familiar = familiarAt({ xp: 640, hour: 17.5 })
  const bitmaps: Bitmap[] = []
  for (let elapsed = 0; elapsed < ANIMATION_MS; elapsed += FRAME_MS) {
    ANIMATION_EVENTS.filter(event => event.atMs === elapsed).forEach(event => event.run(familiar))
    familiar.tick({ dtMs: FRAME_MS })
    if (elapsed % ANIMATION_FRAME_MS === 0) {
      bitmaps.push(snapshot(familiar.frame()))
    }
  }
  return { frameMs: ANIMATION_FRAME_MS, bitmaps }
}
