import { FORM_NAMES } from '../sim/moves'
import type { Progress } from '../sim/types'
import { CHAPTERS, chapterAt, maxHpFor } from './campaign'

export function statusLine(progress: Progress): string {
  const chapter = chapterAt(progress.chapter)
  const night = progress.cycle > 1 ? ` · night ${progress.cycle}` : ''
  return `Chapter ${progress.chapter + 1}: ${chapter.place} · ${chapter.demon} ${progress.demonHp}/${maxHpFor(progress)}${night}`
}

export function storySoFar(progress: Progress): string {
  const finished = CHAPTERS.slice(0, progress.chapter).map(
    (chapter, index) => `${index + 1}. ${chapter.place}: ${chapter.opening} ${chapter.ending}`,
  )
  const current = chapterAt(progress.chapter)
  const lines = [
    progress.cycle > 1 ? `Night ${progress.cycle}. The demons came back stronger after dawn ${progress.cycle - 1}.` : 'The Long Night.',
    ...finished,
    `${progress.chapter + 1}. ${current.place} (now): ${current.opening} ${current.demon} has ${progress.demonHp} of ${maxHpFor(progress)} left.`,
    '',
    `How the fight works: reading and searching is Tanjiro's ${FORM_NAMES.water}. Edits are Inosuke's ${FORM_NAMES.beast}. Commands are Zenitsu's ${FORM_NAMES.thunder}. Agents call the Flame Hashira. Each of your prompts brings Nezuko's ${FORM_NAMES.flame}, and a finished turn lands Tanjiro's ${FORM_NAMES.sun}. Failed tools let the demon strike back.`,
    `Lifetime: ${progress.attacks} attacks, ${progress.defeated} demons defeated, ${progress.dawns} dawns.`,
  ]
  return lines.join('\n')
}
