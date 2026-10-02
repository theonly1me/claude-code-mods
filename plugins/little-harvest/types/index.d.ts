export type WorldState = { activity: 'idle' | 'thinking' | 'searching' | 'reading' | 'editing' | 'testing' | 'working'; tick: number; activityUntil: number; pending: number; completed: number; harvests: number; kills: number; crops: number; beds: number[]; celebration: number; working: boolean; contributions: { completed: number; harvests: number; kills: number }; game: { x: number; y: number; velocity: number; direction: number; movingUntil: number; grounded: boolean; meals: number; humans: number[]; feeding: { x: number; startedAt: number } | null; platforms: { x: number; y: number; width: number }[]; clock: number; passedChecks: number; failedChecks: number; builds: number } }
export type SceneClaim = { enabled: boolean; selectedAt: number; expanded: boolean; playing: boolean }
export type ExplanationEntry = { text: string; evidenceIds: string[] }
export type SharedAnalysis = { summary: string; entries: ExplanationEntry[]; before: ExplanationEntry[]; after: ExplanationEntry[] }
export type Publication = { enabled: boolean; heartbeat: number; revision: string; status: 'waiting' | 'running' | 'ready' | 'unavailable'; analysis: SharedAnalysis | null; requests: number; tokens: number }

declare module 'claude-code' {
  interface PluginState {
    'night-feast': { claim: SceneClaim; lifecycle: WorldState }
    'little-harvest': { claim: SceneClaim; lifecycle: WorldState }
    'samurai-dojo': { claim: SceneClaim; lifecycle: WorldState }
    'pocket-familiar': { claim: SceneClaim; lifecycle: WorldState }
    'change-journal': { analysis: Publication }
    'behavior-map': { analysis: Publication }
  }
}
