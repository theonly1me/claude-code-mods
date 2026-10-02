import type { ModelEffort } from 'claude-code'

export type Evidence = { id: string; tool: string; status: 'pending' | 'successful' | 'failed' | 'denied'; kind: 'edit' | 'check' | 'command' | 'read'; target: string; before: string; after: string; detail: string }
export type Explanation = { text: string; evidenceIds: string[] }
export type Analysis = { summary: string; entries: Explanation[]; before: Explanation[]; after: Explanation[] }
export type AnalysisPublication = { enabled: boolean; heartbeat: number; revision: string; status: 'waiting' | 'running' | 'ready' | 'unavailable'; analysis: Analysis | null; requests: number; tokens: number }
export type SummaryConfiguration = { enabled: boolean; model: string; effort: ModelEffort }
export type AnalysisController = { evidence: Evidence[]; revision: string; configuration: SummaryConfiguration; publication: AnalysisPublication; turnId: string; generation: number; dirtyAt: number; lastRequestAt: number; final: boolean; running: boolean; visible: boolean; selected: string | undefined; sequence: number }
