import { clearBitmap, createBitmap } from '../shared/pixel/bitmap'
import type { Bitmap } from '../shared/pixel/bitmap'
import { drawScene } from '../draw/scene'
import { chapterAt, maxHpFor } from '../story/campaign'
import { freshProgress, nextChapter } from '../story/progress'
import { advanceActor, createActors, isBusy, launch, placeFormation, stagger } from './actors'
import {
  ARRIVING_MS, COUNTER_MS, DAWN_MS, DEMON_RIGHT_MARGIN, DEMON_WIDTH, DYING_MS, FLASH_MS,
  GROUND_TOP, MAX_COLUMNS, MAX_HEARTS, MAX_QUEUE, REGROUP_HEAL, SLAYER_WIDTH, STAGE_HEIGHT,
} from './constants'
import { NEZUKO_KICK, SUN_DANCE, attackFor } from './moves'
import { advanceParticles, ashBurst, attackBurst, clawBurst } from './particles'
import type { Attack, BattlePhase, Particle, Progress, StoryEvent } from './types'

export function createBattle() {
  let width = MAX_COLUMNS
  let bitmap = createBitmap({ width, height: STAGE_HEIGHT })
  let progress: Progress = freshProgress()
  const actors = createActors(width)
  let queue: Attack[] = []
  let counters = 0
  let counterMs = 0
  let particles: Particle[] = []
  let events: StoryEvent[] = []
  let phase: BattlePhase = 'fighting'
  let phaseMs = 0
  let clockMs = 0
  let flashMs = 0
  let idleMs = 0
  let hearts = MAX_HEARTS
  let shownHp = progress.demonHp

  const demonX = (): number => width - DEMON_WIDTH - DEMON_RIGHT_MARGIN
  const maxHp = (): number => maxHpFor(progress)

  function damage(amount: number): void {
    if (phase !== 'fighting') {
      return
    }
    progress = { ...progress, demonHp: Math.max(0, progress.demonHp - amount), attacks: progress.attacks + 1 }
    flashMs = FLASH_MS
    if (progress.demonHp === 0) {
      phase = 'dying'
      phaseMs = 0
      queue = []
      counters = 0
      particles.push(...ashBurst({ x: demonX(), y: 1, width: DEMON_WIDTH, height: 12, seed: progress.chapter }))
      events.push({ kind: 'defeated', chapter: progress.chapter })
    }
  }

  function enqueue(attack: Attack): void {
    idleMs = 0
    if (queue.length >= MAX_QUEUE) {
      damage(attack.damage)
      return
    }
    queue.push(attack)
  }

  function counterHit(): void {
    const target = actors.find(candidate => candidate.mode === 'home' && candidate.name !== 'hashira')
    if (target) {
      stagger(target)
      particles.push(...clawBurst({ x: target.x + 1, y: GROUND_TOP - 10 }))
    }
    hearts -= 1
    if (hearts <= 0) {
      hearts = MAX_HEARTS
      progress = { ...progress, demonHp: Math.min(maxHp(), Math.round(progress.demonHp + maxHp() * REGROUP_HEAL)) }
      events.push({ kind: 'regroup' })
    }
  }

  function advancePhase(): void {
    if (phase === 'dying' && phaseMs >= DYING_MS) {
      const next = nextChapter(progress)
      progress = next.progress
      shownHp = progress.demonHp
      phase = next.isDawn ? 'dawn' : 'arriving'
      phaseMs = 0
      events.push(next.isDawn ? { kind: 'dawn' } : { kind: 'chapter', chapter: progress.chapter })
    } else if (phase === 'dawn' && phaseMs >= DAWN_MS) {
      phase = 'arriving'
      phaseMs = 0
      events.push({ kind: 'chapter', chapter: progress.chapter })
    } else if (phase === 'arriving' && phaseMs >= ARRIVING_MS) {
      phase = 'fighting'
      phaseMs = 0
    }
  }

  function advanceFight(dtMs: number): void {
    if (counterMs > 0) {
      const wasBeforeHit = counterMs > COUNTER_MS / 2
      counterMs -= dtMs
      if (wasBeforeHit && counterMs <= COUNTER_MS / 2) {
        counterHit()
      }
      return
    }
    if (actors.some(isBusy)) {
      return
    }
    if (counters > 0) {
      counters -= 1
      counterMs = COUNTER_MS
      return
    }
    const attack = queue.shift()
    const attacker = attack ? actors.find(candidate => candidate.name === attack.attacker) : undefined
    if (attack && attacker) {
      launch({ actor: attacker, attack })
    }
  }

  return {
    resize(columns: number): void {
      if (columns !== width) {
        width = columns
        bitmap = createBitmap({ width, height: STAGE_HEIGHT })
        placeFormation({ actors, width })
      }
    },
    restore(saved: Progress): void {
      progress = saved
      shownHp = saved.demonHp
    },
    progress: (): Progress => progress,
    hearts: (): number => hearts,
    phase: (): BattlePhase => phase,
    strike(options: { tool: string; isFailure: boolean }): void {
      if (options.isFailure) {
        idleMs = 0
        counters = Math.min(MAX_QUEUE, counters + 1)
        return
      }
      enqueue(attackFor(options.tool))
    },
    summonNezuko: (): void => enqueue(NEZUKO_KICK),
    finish(): void {
      hearts = Math.min(MAX_HEARTS, hearts + 1)
      enqueue(SUN_DANCE)
    },
    takeEvents(): StoryEvent[] {
      const taken = events
      events = []
      return taken
    },
    tick(dtMs: number): void {
      clockMs += dtMs
      phaseMs += dtMs
      idleMs += dtMs
      flashMs = Math.max(0, flashMs - dtMs)
      shownHp = Math.max(progress.demonHp, shownHp - (dtMs / 1000) * maxHp() * 0.4)
      particles = advanceParticles({ particles, dtMs })
      advancePhase()
      if (phase === 'fighting') {
        advanceFight(dtMs)
      }
      actors.forEach(actor => {
        const step = advanceActor({ actor, dtMs, targetX: demonX() - SLAYER_WIDTH - 1 })
        if (step.didImpact && actor.attack) {
          particles.push(...attackBurst({ kind: actor.attack.kind, x: demonX() + 4, y: GROUND_TOP - 7, seed: progress.attacks }))
          damage(actor.attack.damage)
        }
      })
    },
    frame(): Bitmap {
      clearBitmap(bitmap)
      const chapter = chapterAt(progress.chapter)
      const lunge = counterMs > 0 ? Math.round(Math.sin(((COUNTER_MS - counterMs) / COUNTER_MS) * Math.PI) * -10) : 0
      const arrival = phase === 'arriving' ? Math.round((1 - phaseMs / ARRIVING_MS) * 24) : 0
      drawScene({
        bitmap,
        clockMs,
        chapter,
        chapterNumber: progress.chapter + 1,
        cycle: progress.cycle,
        phase,
        dawn: phase === 'dawn' ? Math.min(1, phaseMs / 1500, (DAWN_MS - phaseMs) / 1500 + 0.3) : 0,
        dissolve: phase === 'dying' ? Math.min(1, phaseMs / (DYING_MS * 0.7)) : 0,
        actors,
        particles,
        demonX: demonX() + lunge + arrival,
        isDemonFlashing: flashMs > 0,
        isTrueForm: chapter.shape === 'muzan' && progress.demonHp < maxHp() / 2,
        hearts,
        hp: progress.demonHp,
        shownHp,
        maxHp: maxHp(),
        idleMs,
      })
      return bitmap
    },
  }
}

export type Battle = ReturnType<typeof createBattle>
