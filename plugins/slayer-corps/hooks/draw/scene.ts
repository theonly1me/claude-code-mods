import type { Bitmap } from '../shared/pixel/bitmap'
import type { Actor, BattlePhase, Particle } from '../sim/types'
import type { Chapter } from '../story/campaign'
import { drawActors } from './actors'
import { drawBackdrop } from './backdrops'
import { drawDemon } from './demon'
import { drawHud, drawParticles } from './hud'

export type SceneView = {
  bitmap: Bitmap
  clockMs: number
  chapter: Chapter
  cycle: number
  phase: BattlePhase
  dawn: number
  dissolve: number
  actors: readonly Actor[]
  particles: readonly Particle[]
  demonX: number
  isDemonFlashing: boolean
  isTrueForm: boolean
  hearts: number
  hp: number
  shownHp: number
  maxHp: number
}

export function drawScene(view: SceneView): void {
  const { bitmap } = view
  drawBackdrop({ bitmap, backdrop: view.chapter.backdrop, clockMs: view.clockMs, dawn: view.dawn })
  if (view.phase !== 'dawn') {
    drawDemon({
      bitmap,
      chapter: view.chapter,
      x: view.demonX,
      clockMs: view.clockMs,
      isFlashing: view.isDemonFlashing,
      dissolve: view.dissolve,
      isTrueForm: view.isTrueForm,
    })
  }
  drawActors({ bitmap, actors: view.actors, clockMs: view.clockMs, isCelebrating: view.phase === 'dawn' })
  drawParticles({ bitmap, particles: view.particles })
  if (view.phase !== 'dawn') {
    drawHud({
      bitmap,
      cycle: view.cycle,
      hearts: view.hearts,
      hp: view.hp,
      shownHp: view.shownHp,
      maxHp: view.maxHp,
    })
  }
}
