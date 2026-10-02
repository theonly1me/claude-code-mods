export type Progress = { completed: number; harvests: number; kills: number }
export const emptyProgress: Progress = { completed: 0, harvests: 0, kills: 0 }

export function parseProgress(value: unknown): Progress {
  if (typeof value !== 'object' || value === null) return { ...emptyProgress }
  return {
    completed: 'completed' in value && typeof value.completed === 'number' ? Math.max(0, value.completed) : 0,
    harvests: 'harvests' in value && typeof value.harvests === 'number' ? Math.max(0, value.harvests) : 0,
    kills: 'kills' in value && typeof value.kills === 'number' ? Math.max(0, value.kills) : 0,
  }
}

export function totalProgress(values: Progress[]): Progress {
  return values.reduce((total, value) => ({ completed: total.completed + value.completed, harvests: total.harvests + value.harvests, kills: total.kills + value.kills }), { ...emptyProgress })
}

export function petStage(completed: number): 'egg' | 'hatchling' | 'juvenile' | 'adult' {
  if (completed >= 50) return 'adult'
  if (completed >= 10) return 'juvenile'
  return completed >= 1 ? 'hatchling' : 'egg'
}
