import type { ToolKind } from './sim/types'

const READ_TOOLS = new Set(['Read', 'Grep', 'Glob', 'LSP', 'WebFetch', 'WebSearch', 'ListMcpResourcesTool', 'ReadMcpResourceTool'])
const EDIT_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit'])
const TEST_COMMAND =
  /(^|[\s;&|(])(npm|pnpm|yarn|bun)\s+(run\s+)?(test|check|vitest|jest)\b|(^|[\s;&|(])(npx\s+)?(vitest|jest|mocha|ava|playwright\s+test|pytest|tox|rspec|phpunit)\b|(^|[\s;&|(])(go|cargo|deno|swift|dotnet|mix|gradle|mvn)\s+test\b|(^|[\s;&|(])node\s+(--test\b|\S*\.test\.[cm]?[jt]s)|(^|[\s;&|(])claude\s+plugin\s+test\b|(^|[\s;&|(])make\s+(test|check)\b|python3?\s+-m\s+(pytest|unittest)\b/

export function isTestCommand(command: string): boolean {
  return TEST_COMMAND.test(command)
}

export function toolKindOf(options: { tool: string; command: string }): ToolKind {
  if (READ_TOOLS.has(options.tool)) {
    return 'read'
  }
  if (EDIT_TOOLS.has(options.tool)) {
    return 'edit'
  }
  return options.tool === 'Bash' && isTestCommand(options.command) ? 'test' : 'other'
}

export function isCreatedFile(result: unknown): boolean {
  return typeof result === 'object' && result !== null && 'type' in result && result.type === 'create'
}

export function localHour(): number {
  const now = new Date()
  return now.getHours() + now.getMinutes() / 60
}
