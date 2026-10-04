import { findingKey } from './scan'
import type { Candidate, DetectJob, Finding, FindingSource } from './types'

export const ON_STORE_KEY = 'isOn'
const MAX_FINDINGS = 200
const MAX_JOBS = 20

export type UnslopSettings = { chatStyle: boolean; modelPass: boolean; detectModel: string; commentBlockLines: number }

type Unslop = {
  isOn: boolean
  isWorking: boolean
  turn: number
  root: string
  findings: Finding[]
  jobs: DetectJob[]
  nextId: number
  settings: UnslopSettings
}

const unslop: Unslop = {
  isOn: true,
  isWorking: false,
  turn: 0,
  root: '',
  findings: [],
  jobs: [],
  nextId: 1,
  settings: { chatStyle: true, modelPass: true, detectModel: 'haiku', commentBlockLines: 4 },
}

export function unslopView(): Readonly<Unslop> {
  return unslop
}

export function configureUnslop(settings: UnslopSettings): void {
  unslop.settings = settings
}

export function resetUnslop(options: { root: string }): void {
  unslop.root = options.root
  unslop.isWorking = false
  unslop.jobs = []
}

export function setOn(isOn: boolean): void {
  unslop.isOn = isOn
}

export function startTurn(): void {
  unslop.turn += 1
  unslop.isWorking = true
}

export function finishTurn(): void {
  unslop.isWorking = false
}

export function addFindings(options: {
  path: string
  absolutePath: string
  candidates: readonly Candidate[]
  source: FindingSource
  isNotified: boolean
}): Finding[] {
  const known = new Set(
    unslop.findings
      .filter(finding => finding.status === 'open' && finding.absolutePath === options.absolutePath)
      .map(finding => findingKey(finding)),
  )
  const added = options.candidates
    .filter(candidate => !known.has(findingKey(candidate)))
    .map(candidate => {
      const finding: Finding = {
        ...candidate,
        id: unslop.nextId,
        path: options.path,
        absolutePath: options.absolutePath,
        source: options.source,
        status: 'open',
        isNotified: options.isNotified,
        turn: unslop.turn,
      }
      unslop.nextId += 1
      return finding
    })
  unslop.findings = [...unslop.findings, ...added].slice(-MAX_FINDINGS)
  return added
}

export function openFindings(): Finding[] {
  return unslop.findings.filter(finding => finding.status === 'open')
}

export function openFindingsFor(absolutePath: string): Finding[] {
  return openFindings().filter(finding => finding.absolutePath === absolutePath)
}

export function markRemoved(ids: readonly number[]): void {
  unslop.findings.forEach(finding => {
    if (ids.includes(finding.id)) {
      finding.status = 'removed'
    }
  })
}

export function markNotified(ids: readonly number[]): void {
  unslop.findings.forEach(finding => {
    if (ids.includes(finding.id)) {
      finding.isNotified = true
    }
  })
}

export function clearRemoved(): number {
  const before = unslop.findings.length
  unslop.findings = unslop.findings.filter(finding => finding.status === 'open')
  return before - unslop.findings.length
}

export function queueJob(job: DetectJob): void {
  unslop.jobs = [...unslop.jobs, job].slice(-MAX_JOBS)
}

export function takeJob(): DetectJob | undefined {
  const [job, ...rest] = unslop.jobs
  unslop.jobs = rest
  return job
}

export function counts(): { removed: number; open: number; waiting: number } {
  const open = openFindings()
  return {
    removed: unslop.findings.filter(finding => finding.status === 'removed').length,
    open: open.length,
    waiting: open.filter(finding => !finding.isNotified).length,
  }
}

export function filesWithOpenFindings(): string[] {
  return [...new Set(openFindings().map(finding => finding.absolutePath))]
}
