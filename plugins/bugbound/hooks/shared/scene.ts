export const sceneNames = ['bugbound', 'little-harvest', 'samurai-dojo', 'pocket-familiar'] as const
export type SceneName = typeof sceneNames[number]
export type Claim = { enabled: boolean; selectedAt: number; expanded: boolean; playing: boolean }
export type SceneEntry = { name: SceneName; claim: Claim | undefined }

export function selectedScene(entries: readonly SceneEntry[]): SceneName | undefined {
  return entries.filter(entry => entry.claim?.enabled)
    .sort((left, right) => (right.claim?.selectedAt ?? 0) - (left.claim?.selectedAt ?? 0)
      || sceneNames.indexOf(left.name) - sceneNames.indexOf(right.name))[0]?.name
}

export function sceneDimensions(options: { columns: number; rows: number; expanded: boolean; reservedRows: number }) {
  return { columns: Math.max(1, Math.min(512, options.columns)), rows: Math.max(0, Math.min(256, options.rows - options.reservedRows, options.expanded ? 256 : 6)) }
}

export const sceneCommands = { bugbound: 'bugbound', 'little-harvest': 'farm', 'samurai-dojo': 'dojo', 'pocket-familiar': 'pet' } as const
export const sceneTitles = { bugbound: 'Bugbound', 'little-harvest': 'Little Harvest', 'samurai-dojo': 'Samurai Dojo', 'pocket-familiar': 'Pocket Familiar' } as const
