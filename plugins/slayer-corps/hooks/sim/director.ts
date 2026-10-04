import { ROTATION, SIGNATURES } from './moves'
import type { CorpsMember } from './moves'
import type { Attack, MoveStyle } from './types'

const REPERTOIRE: Record<CorpsMember, readonly MoveStyle[]> = {
  tanjiro: ['form', 'clash', 'feint', 'dodge'],
  zenitsu: ['doze', 'dodge', 'feint', 'clash'],
  inosuke: ['clash', 'feint', 'dodge', 'form'],
  nezuko: ['clash', 'dodge', 'form', 'feint'],
}

const GAPS_MS = [320, 560, 420, 680, 380]

export function createDirector() {
  let turn = 0
  let waitMs = 600

  return {
    wait(dtMs: number): boolean {
      waitMs -= dtMs
      return waitMs <= 0
    },

    plan(): Attack {
      const attacker = ROTATION[turn % ROTATION.length] ?? 'tanjiro'
      const moves = REPERTOIRE[attacker]
      const style = moves[Math.floor(turn / ROTATION.length) % moves.length] ?? 'feint'
      waitMs = GAPS_MS[turn % GAPS_MS.length] ?? 400
      turn += 1
      return { attacker, kind: SIGNATURES[attacker], damage: 0, style, source: 'sparring' }
    },
  }
}

export type Director = ReturnType<typeof createDirector>
