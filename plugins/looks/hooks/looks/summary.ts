import { clip, countOf, fieldsOf, firstLine, listOf, plural, textOf } from './fields'
import type { Fields } from './fields'

export type ToolState = {
  isRunning: boolean
  isErrored: boolean
  isInterrupted: boolean
}

export type ToolSummary = {
  verb: string
  target: string
  hint: string
  added: number
  removed: number
}

type Described = { verb: string; target: string; hint?: string; added?: number; removed?: number }
type Describe = (options: { input: Fields; output: Fields; path: (path: string) => string }) => Described

const TARGET_LIMIT = 72
const ERROR_LIMIT = 60

function patchCounts(output: Fields): { added: number; removed: number } {
  const lines = listOf(output.structuredPatch).flatMap(hunk => listOf(fieldsOf(hunk).lines)).map(textOf)
  return {
    added: lines.filter(line => line.startsWith('+')).length,
    removed: lines.filter(line => line.startsWith('-')).length,
  }
}

function nonEmptyLines(text: string): number {
  return text.split('\n').filter(line => line.trim() !== '').length
}

const describeRead: Describe = ({ input, output, path }) => {
  const file = fieldsOf(output.file)
  const lines = countOf(file.numLines)
  const start = countOf(file.startLine) ?? 1
  const isPartial = start > 1 || countOf(input.offset) !== undefined
  const hint = output.type === 'image' ? 'image' : lines === undefined ? '' : isPartial ? `lines ${start} to ${start + lines - 1}` : plural({ count: lines, word: 'line' })
  return { verb: 'Read', target: path(textOf(input.file_path)), hint }
}

const describeEdit: Describe = ({ input, output, path }) => ({
  verb: 'Edit',
  target: path(textOf(input.file_path)),
  hint: input.replace_all === true ? 'every match' : '',
  ...patchCounts(output),
})

const describeWrite: Describe = ({ input, output, path }) => {
  const target = path(textOf(input.file_path))
  if (output.type === 'update') {
    return { verb: 'Write', target, ...patchCounts(output) }
  }
  return { verb: 'Create', target, hint: plural({ count: textOf(input.content).split('\n').length, word: 'line' }) }
}

const describeBash: Describe = ({ input, output }) => {
  const shown = nonEmptyLines(`${textOf(output.stdout)}\n${textOf(output.stderr)}`)
  const isBackground = typeof output.backgroundTaskId === 'string' || input.run_in_background === true
  const hint = isBackground ? 'in background' : shown === 0 ? 'no output' : plural({ count: shown, word: 'line' })
  return { verb: 'Run', target: firstLine(textOf(input.command)), hint }
}

const describeGrep: Describe = ({ input, output, path }) => {
  const where = textOf(input.path)
  const files = countOf(output.numFiles) ?? listOf(output.filenames).length
  const matches = countOf(output.numMatches) ?? countOf(output.numLines)
  return {
    verb: 'Search',
    target: `"${textOf(input.pattern)}"${where === '' ? '' : ` in ${path(where)}`}`,
    hint: matches === undefined ? plural({ count: files, word: 'file' }) : plural({ count: matches, word: 'match', many: 'matches' }),
  }
}

const describeGlob: Describe = ({ input, output }) => ({
  verb: 'Find',
  target: textOf(input.pattern),
  hint: plural({ count: countOf(output.numFiles) ?? listOf(output.filenames).length, word: 'file' }),
})

const describeFetch: Describe = ({ input, output }) => {
  const code = countOf(output.code)
  const bytes = countOf(output.bytes)
  const size = bytes === undefined ? '' : `, ${Math.max(1, Math.round(bytes / 1024))} KB`
  return { verb: 'Fetch', target: textOf(input.url).replace(/^https?:\/\//, ''), hint: code === undefined ? '' : `${code}${size}` }
}

const describeWebSearch: Describe = ({ input, output }) => ({
  verb: 'Web search',
  target: `"${textOf(input.query)}"`,
  hint: plural({ count: listOf(output.results).length, word: 'result' }),
})

const describeTodos: Describe = ({ input }) => {
  const todos = listOf(input.todos).map(fieldsOf)
  const done = todos.filter(todo => todo.status === 'completed').length
  const current = todos.find(todo => todo.status === 'in_progress')
  return { verb: 'Todos', target: current ? textOf(current.activeForm) || textOf(current.content) : '', hint: `${done} of ${todos.length} done` }
}

const DESCRIBERS: Readonly<Record<string, Describe>> = {
  Read: describeRead,
  Edit: describeEdit,
  Write: describeWrite,
  Bash: describeBash,
  Grep: describeGrep,
  Glob: describeGlob,
  WebFetch: describeFetch,
  WebSearch: describeWebSearch,
  TodoWrite: describeTodos,
}

const ENGINE_ROW_TOOLS: readonly string[] = ['AskUserQuestion', 'EnterPlanMode', 'ExitPlanMode']
const TARGET_KEYS: readonly string[] = ['description', 'skill', 'subject', 'query', 'url', 'file_path', 'notebook_path', 'path', 'pattern', 'command', 'prompt', 'name', 'title']

function toolLabel(tool: string): string {
  const [prefix, server, ...rest] = tool.split('__')
  if (prefix !== 'mcp' || server === undefined || rest.length === 0) {
    return tool
  }
  return `${server.replace(/^(claude_ai_|plugin_[a-z0-9-]+_)/, '')} ${rest.join(' ').replace(/_/g, ' ')}`
}

function describerOf(tool: string): Describe | undefined {
  if (ENGINE_ROW_TOOLS.includes(tool)) {
    return undefined
  }
  return DESCRIBERS[tool] ?? (({ input, path }) => {
    const key = TARGET_KEYS.find(candidate => textOf(input[candidate]).trim() !== '')
    const value = key === undefined ? '' : firstLine(textOf(input[key]))
    return { verb: toolLabel(tool), target: key === 'file_path' || key === 'path' ? path(value) : value }
  })
}

export function hasOwnResult(tool: string): boolean {
  return Object.hasOwn(DESCRIBERS, tool) && tool !== 'TodoWrite'
}

export function isSummarized(tool: string): boolean {
  return describerOf(tool) !== undefined
}

function stateHint(options: { state: ToolState; output: unknown }): string | undefined {
  if (options.state.isInterrupted) {
    return 'interrupted'
  }
  if (options.state.isRunning) {
    return '…'
  }
  if (options.state.isErrored) {
    const reason = firstLine(typeof options.output === 'string' ? options.output : textOf(fieldsOf(options.output).stderr))
    return reason === '' ? 'failed' : `failed: ${clip({ text: reason.replace(/<\/?[a-z_]+>/g, ''), limit: ERROR_LIMIT })}`
  }
  return undefined
}

export function summarizeTool(options: { tool: string; input: unknown; output: unknown; state: ToolState; path: (path: string) => string }): ToolSummary | undefined {
  const describe = describerOf(options.tool)
  if (!describe) {
    return undefined
  }
  const isSettled = !options.state.isRunning && !options.state.isErrored && !options.state.isInterrupted
  const described = describe({ input: fieldsOf(options.input), output: isSettled ? fieldsOf(options.output) : {}, path: options.path })
  const override = stateHint({ state: options.state, output: options.output })
  return {
    verb: described.verb,
    target: clip({ text: described.target, limit: TARGET_LIMIT }),
    hint: override ?? described.hint ?? '',
    added: override === undefined ? described.added ?? 0 : 0,
    removed: override === undefined ? described.removed ?? 0 : 0,
  }
}
