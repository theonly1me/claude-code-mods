import { chapterAt, maxHpFor } from '../story/campaign'
import type { Chapter } from '../story/campaign'
import { freshProgress, nextChapter } from '../story/progress'
import { ARRIVING_MS, DAWN_MS, DYING_MS, FLASH_MS, MAX_HEARTS, REGROUP_HEAL } from './constants'
import type { ActivityLog } from './log'
import { eventLine, hitLine } from './narration'
import type { Attack, BattlePhase, Progress, StoryEvent } from './types'

export function createProgression(log: ActivityLog) {
  let progress: Progress = freshProgress()
  let events: StoryEvent[] = []
  let phase: BattlePhase = 'fighting'
  let phaseMs = 0
  let flashMs = 0
  let hearts = MAX_HEARTS
  let shownHp = progress.demonHp

  const maxHp = (): number => maxHpFor(progress)

  function record(event: StoryEvent): void {
    events.push(event)
    log.add(eventLine(event))
  }

  return {
    restore(saved: Progress): void {
      progress = saved
      shownHp = saved.demonHp
    },
    progress: (): Progress => progress,
    chapter: (): Chapter => chapterAt(progress.chapter),
    maxHp,
    phase: (): BattlePhase => phase,
    phaseMs: (): number => phaseMs,
    hearts: (): number => hearts,
    shownHp: (): number => shownHp,
    isFlashing: (): boolean => flashMs > 0,
    takeEvents(): StoryEvent[] {
      const taken = events
      events = []
      return taken
    },

    damage(attack: Attack): boolean {
      if (phase !== 'fighting') {
        return false
      }
      progress = { ...progress, demonHp: Math.max(0, progress.demonHp - attack.damage), attacks: progress.attacks + 1 }
      flashMs = FLASH_MS
      log.add(hitLine(attack))
      if (progress.demonHp > 0) {
        return false
      }
      phase = 'dying'
      phaseMs = 0
      record({ kind: 'defeated', chapter: progress.chapter })
      return true
    },

    loseHeart(): void {
      hearts -= 1
      if (hearts > 0) {
        return
      }
      hearts = MAX_HEARTS
      progress = { ...progress, demonHp: Math.min(maxHp(), Math.round(progress.demonHp + maxHp() * REGROUP_HEAL)) }
      record({ kind: 'regroup' })
    },

    gainHeart(): void {
      hearts = Math.min(MAX_HEARTS, hearts + 1)
    },

    advance(dtMs: number): void {
      phaseMs += dtMs
      flashMs = Math.max(0, flashMs - dtMs)
      shownHp = Math.max(progress.demonHp, shownHp - (dtMs / 1000) * maxHp() * 0.4)
      if (phase === 'dying' && phaseMs >= DYING_MS) {
        const next = nextChapter(progress)
        progress = next.progress
        shownHp = progress.demonHp
        phase = next.isDawn ? 'dawn' : 'arriving'
        phaseMs = 0
        record(next.isDawn ? { kind: 'dawn' } : { kind: 'chapter', chapter: progress.chapter })
      } else if (phase === 'dawn' && phaseMs >= DAWN_MS) {
        phase = 'arriving'
        phaseMs = 0
        record({ kind: 'chapter', chapter: progress.chapter })
      } else if (phase === 'arriving' && phaseMs >= ARRIVING_MS) {
        phase = 'fighting'
        phaseMs = 0
      }
    },
  }
}

export type Progression = ReturnType<typeof createProgression>
