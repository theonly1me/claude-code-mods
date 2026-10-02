export const sceneNames = ['night-feast', 'little-harvest', 'samurai-dojo', 'pocket-familiar'] as const
export type SceneName = typeof sceneNames[number]
export type Claim = { enabled: boolean; selectedAt: number; expanded: boolean; playing: boolean }
export type SceneEntry = { name: SceneName; claim: Claim | undefined }

export function selectedScene(entries: readonly SceneEntry[]): SceneName | undefined {
  return entries.filter(entry => entry.claim?.enabled)
    .sort((left, right) => (right.claim?.selectedAt ?? 0) - (left.claim?.selectedAt ?? 0)
      || sceneNames.indexOf(left.name) - sceneNames.indexOf(right.name))[0]?.name
}

export function sceneDimensions(options: { columns: number; rows: number; expanded: boolean; reservedRows: number }) {
  return { columns: Math.max(1, Math.min(512, options.columns)), rows: Math.max(0, Math.min(256, options.rows - options.reservedRows, Math.floor(options.rows / 3), options.expanded ? 12 : 6)) }
}

export const sceneCommands = { 'night-feast': 'feast', 'little-harvest': 'farm', 'samurai-dojo': 'dojo', 'pocket-familiar': 'pet' } as const
export const sceneTitles = { 'night-feast': 'Night Feast', 'little-harvest': 'Little Harvest', 'samurai-dojo': 'Samurai Dojo', 'pocket-familiar': 'Pocket Familiar' } as const

export const sceneLabels = { 'night-feast': 'Feast', 'little-harvest': 'Farm', 'samurai-dojo': 'Dojo', 'pocket-familiar': 'Pet' } as const
