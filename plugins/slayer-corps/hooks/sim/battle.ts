import { clearBitmap, createBitmap } from '../shared/pixel/bitmap'
import type { Bitmap } from '../shared/pixel/bitmap'
import { drawBattle } from '../draw/battleView'
import { createActors, interruptSparring, isAtRest, isBusy, isWorking, laneFor, launch, placeFormation, stagger } from './actors'
import {
  COUNTER_MS, DEMON_RIGHT_MARGIN, DEMON_WIDTH, GROUND_TOP, LOG_LIMIT, MAX_COLUMNS, MAX_QUEUE, RECOIL_MS, SLAYER_WIDTH,
  STAGE_HEIGHT,
} from './constants'
import { createDirector } from './director'
import { createLog } from './log'
import { advanceActor } from './motion'
import { NEZUKO_KICK, SUN_DANCE, isCorpsMember, rememberAttacker, workAttack } from './moves'
import type { CorpsMember } from './moves'
import { counterLine, sparringLine } from './narration'
import { advanceParticles, ashBurst, attackBurst, clawBurst, parryBurst } from './particles'
import { createProgression } from './progression'
import type { Actor, Attack, Particle } from './types'

export function createBattle() {
  let width = MAX_COLUMNS
  let bitmap = createBitmap({ width, height: STAGE_HEIGHT })
  const log = createLog(LOG_LIMIT)
  const story = createProgression(log)
  const actors = createActors(width)
  const director = createDirector()
  let recent: CorpsMember[] = []
  let queue: Attack[] = []
  let counters = 0
  let counterMs = 0
  let swipeMs = 0
  let recoilMs = 0
  let particles: Particle[] = []
  let clockMs = 0

  const demonX = (): number => width - DEMON_WIDTH - DEMON_RIGHT_MARGIN

  function damage(attack: Attack): void {
    if (!story.damage(attack)) {
      return
    }
    queue = []
    counters = 0
    interruptSparring(actors)
    particles.push(...ashBurst({ x: demonX(), y: 1, width: DEMON_WIDTH, height: 12, seed: story.progress().chapter }))
  }

  function enqueue(attack: Attack): void {
    interruptSparring(actors)
    if (queue.length >= MAX_QUEUE) {
      damage(attack)
      return
    }
    queue.push(attack)
  }

  function crossesMidpoint(options: { remainingMs: number; dtMs: number }): boolean {
    return options.remainingMs > COUNTER_MS / 2 && options.remainingMs - options.dtMs <= COUNTER_MS / 2
  }

  function counterHit(): void {
    const target = actors.find(candidate => candidate.mode === 'home' && candidate.name !== 'hashira')
    if (target) {
      stagger(target)
      particles.push(...clawBurst({ x: target.x + 1, y: GROUND_TOP - 10 }))
      log.add(counterLine({ demon: story.chapter().demon, target: target.name }))
    }
    story.loseHeart()
  }

  function advanceSwipe(dtMs: number): void {
    const dodger = actors.find(candidate => candidate.mode === 'hop')
    if (swipeMs > 0 && dodger && crossesMidpoint({ remainingMs: swipeMs, dtMs })) {
      particles.push(...clawBurst({ x: dodger.homeX + 1, y: GROUND_TOP - 10 }))
    }
    swipeMs = Math.max(0, swipeMs - dtMs)
  }

  function startSparring(): void {
    const attack = director.plan()
    const attacker = actors.find(candidate => candidate.name === attack.attacker)
    if (!attacker || attacker.mode !== 'home') {
      return
    }
    launch({ actor: attacker, attack })
    swipeMs = attack.style === 'dodge' ? COUNTER_MS : 0
    log.add(sparringLine({ attack, demon: story.chapter().demon }))
  }

  function advanceFight(dtMs: number): void {
    if (counterMs > 0) {
      const isHitNow = crossesMidpoint({ remainingMs: counterMs, dtMs })
      counterMs -= dtMs
      if (isHitNow) {
        counterHit()
      }
      return
    }
    if (actors.some(isWorking)) {
      return
    }
    if (counters > 0) {
      counters -= 1
      counterMs = COUNTER_MS
      return
    }
    const [attack] = queue
    if (attack) {
      const attacker = actors.find(candidate => candidate.name === attack.attacker)
      if (attacker && isAtRest(attacker)) {
        queue.shift()
        launch({ actor: attacker, attack })
      }
      return
    }
    if (!actors.some(isBusy) && swipeMs <= 0 && director.wait(dtMs)) {
      startSparring()
    }
  }

  function impact(options: { actor: Actor; attack: Attack }): void {
    const { actor, attack } = options
    if (attack.style === 'hit') {
      particles.push(...attackBurst({ kind: attack.kind, x: demonX() + 4, y: GROUND_TOP - 7, seed: story.progress().attacks }))
      damage(attack)
    } else if (attack.style === 'clash' || attack.style === 'doze') {
      particles.push(...parryBurst({ x: demonX() + 1, y: GROUND_TOP - 8, seed: clockMs }))
      recoilMs = RECOIL_MS
    } else {
      particles.push(...attackBurst({ kind: attack.kind, x: actor.x + SLAYER_WIDTH + 2, y: GROUND_TOP - 7, seed: clockMs }))
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
    restore: story.restore,
    progress: story.progress,
    hearts: story.hearts,
    phase: story.phase,
    takeEvents: story.takeEvents,
    log: log.lines,
    actors: (): readonly Actor[] => actors,
    strike(options: { tool: string; isFailure: boolean }): void {
      interruptSparring(actors)
      if (options.isFailure) {
        counters = Math.min(MAX_QUEUE, counters + 1)
        return
      }
      const attack = workAttack({ tool: options.tool, recent })
      if (isCorpsMember(attack.attacker)) {
        recent = rememberAttacker({ recent, attacker: attack.attacker })
      }
      enqueue(attack)
    },
    summonNezuko(): void {
      recent = rememberAttacker({ recent, attacker: 'nezuko' })
      enqueue(NEZUKO_KICK)
    },
    finish(): void {
      story.gainHeart()
      enqueue(SUN_DANCE)
    },
    tick(dtMs: number): void {
      clockMs += dtMs
      recoilMs = Math.max(0, recoilMs - dtMs)
      particles = advanceParticles({ particles, dtMs })
      story.advance(dtMs)
      if (story.phase() === 'fighting') {
        advanceSwipe(dtMs)
        advanceFight(dtMs)
      }
      actors.forEach(actor => {
        const step = advanceActor({ actor, dtMs, frontX: demonX() - SLAYER_WIDTH - 1, laneX: laneFor(width) })
        if (step.didImpact && actor.attack) {
          impact({ actor, attack: actor.attack })
        }
      })
    },
    frame(): Bitmap {
      clearBitmap(bitmap)
      drawBattle({ bitmap, story, actors, particles, clockMs, demonX: demonX(), lungeMs: Math.max(counterMs, swipeMs), isRecoiling: recoilMs > 0 })
      return bitmap
    },
  }
}

export type Battle = ReturnType<typeof createBattle>
