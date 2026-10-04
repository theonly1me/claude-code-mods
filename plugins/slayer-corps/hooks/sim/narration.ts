import { CHAPTERS, chapterAt } from '../story/campaign'
import { sentence } from './log'
import { DISPLAY_NAMES, FORM_NAMES } from './moves'
import type { Attack, SlayerName, StoryEvent } from './types'

const CLASH_VERBS: Record<SlayerName, string> = {
  tanjiro: 'cuts in with Water Breathing',
  nezuko: 'leaps in with a flaming kick',
  zenitsu: 'flashes in',
  inosuke: 'charges with both blades',
  hashira: 'sweeps in with fire',
}

export function sparringLine(options: { attack: Attack; demon: string }): string {
  const { attack, demon } = options
  const name = DISPLAY_NAMES[attack.attacker]
  if (attack.style === 'feint') {
    return `${name} feints at ${demon} and springs back.`
  }
  if (attack.style === 'form') {
    return `${name} shows ${FORM_NAMES[attack.kind]}.`
  }
  if (attack.style === 'dodge') {
    return `${name} dodges a swipe from ${demon}.`
  }
  if (attack.style === 'doze') {
    return `${name} dozes off, then wakes into ${FORM_NAMES.thunder}.`
  }
  return `${name} ${CLASH_VERBS[attack.attacker]}. ${sentence(demon)} blocks.`
}

export function hitLine(attack: Attack): string {
  return `${DISPLAY_NAMES[attack.attacker]}: ${FORM_NAMES[attack.kind]} hits for ${attack.damage} (${attack.source}).`
}

export function counterLine(options: { demon: string; target: SlayerName }): string {
  return `${options.demon} strikes ${DISPLAY_NAMES[options.target]}. A tool failed.`
}

export function eventLine(event: StoryEvent): string {
  if (event.kind === 'defeated') {
    return `${chapterAt(event.chapter).demon} turns to ash.`
  }
  if (event.kind === 'chapter') {
    return `Chapter ${event.chapter + 1}: ${chapterAt(event.chapter).place}.`
  }
  if (event.kind === 'dawn') {
    return `Dawn. ${CHAPTERS[CHAPTERS.length - 1]?.demon ?? 'Muzan'} is gone and the Corps rests.`
  }
  return 'The Corps regroups, and the demon recovers.'
}
