import type { ToolCallInput } from 'claude-code'

export type Activity = 'idle' | 'thinking' | 'searching' | 'reading' | 'editing' | 'testing' | 'working'

export function isTestCommand(command: string): boolean {
  const unquoted = command.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, 'quoted')
  if (/[;|\n]/.test(unquoted)) return false
  const last = unquoted.split('&&').at(-1)?.trim() ?? ''
  return /^(?:(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:test|test:[\w-]+)|(?:npx\s+)?(?:pytest|vitest|jest|playwright\s+test)|(?:python3?\s+-m\s+pytest|cargo\s+test|go\s+test|node\s+--test))(?:\s|$)/.test(last)
}

export function isTestEdit(event: ToolCallInput): boolean {
  return (event.tool === 'Edit' || event.tool === 'Write') && typeof event.file_path === 'string' && /(?:^|\/)(?:tests?|__tests__)(?:\/|$)|(?:\.test\.|\.spec\.|(?:^|\/)test_|_test\.)/.test(event.file_path)
}

export function classifyActivity(event: ToolCallInput): Activity {
  if (['Glob', 'Grep', 'WebSearch', 'WebFetch'].includes(event.tool)) return 'searching'
  if (event.tool === 'Read') return 'reading'
  if (['Edit', 'Write', 'NotebookEdit'].includes(event.tool)) return 'editing'
  if (event.tool === 'Bash' && typeof event.command === 'string' && isTestCommand(event.command)) return 'testing'
  return 'working'
}

export function currentActivity(options: { active: Map<string, Activity>; isWorking: boolean }): Activity {
  const latest = [...options.active.values()].at(-1)
  return latest ?? (options.isWorking ? 'thinking' : 'idle')
}

export function activityLabel(activity: Activity): string {
  return { idle: 'Resting', thinking: 'Planning', searching: 'Exploring', reading: 'Reading', editing: 'Building', testing: 'Testing', working: 'Working' }[activity]
}
