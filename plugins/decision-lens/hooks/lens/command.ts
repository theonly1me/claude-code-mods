import type { LensTab, RuleKind } from './types'

export type SteerKind = RuleKind | 'ask'

export type WhyCommand =
  | { kind: 'open'; tab: LensTab }
  | { kind: 'steer'; steer: SteerKind; number: number }
  | { kind: 'unknown' }

const STEERS: readonly SteerKind[] = ['keep', 'avoid', 'ask']

export const WHY_USAGE =
  'Use /why to open the lens, /why rules for your rules, or /why keep N, /why avoid N, /why ask N, where N is a card number.'

export function parseWhy(args: string): WhyCommand {
  const [word = '', count = '1'] = args.trim().toLowerCase().split(/\s+/)
  if (word === '') {
    return { kind: 'open', tab: 'decisions' }
  }
  if (word === 'rules') {
    return { kind: 'open', tab: 'rules' }
  }
  const steer = STEERS.find(candidate => candidate === word)
  const number = Number(count)
  if (steer === undefined || !Number.isInteger(number) || number < 1) {
    return { kind: 'unknown' }
  }
  return { kind: 'steer', steer, number }
}
