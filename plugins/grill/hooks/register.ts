import type { EngineInterface, Register } from 'claude-code'

import { CHAT_PANE, installChat } from './chat'
import { CHAT_SYSTEM, chatPrompt, parseQuestions, ROUND_SYSTEM, roundPrompt, sharePrompt } from './grill/prompts'
import { addChatMessage, configureGrill, grillView, setMode, setQuestions, startRound, takeJob } from './grill/state'
import type { GrillMode } from './grill/types'
import { installQuestions } from './questions'
import { noop } from './shared/noop'

const JOB_POLL_MS = 400
const MODE_KEY = 'mode'
const MODES: readonly GrillMode[] = ['grill', 'brainstorm', 'off']

let isBusy = false
let projectRoot = ''

function modeFrom(value: unknown): GrillMode | undefined {
  return MODES.find(mode => mode === value)
}

async function complete($: EngineInterface, options: { system: string; prompt: string; maxTokens: number }): Promise<string | undefined> {
  const result = await $.model
    .complete({ model: grillView().helperModel, system: options.system, prompt: options.prompt, maxTokens: options.maxTokens, timeoutMs: 40000 })
    .catch(() => undefined)
  return result?.isAnswered ? result.text.trim() : undefined
}

async function runRound($: EngineInterface, options: { roundId: number }): Promise<void> {
  const round = grillView().round
  if (!round || round.id !== options.roundId) {
    return
  }
  const listing = await $.process
    .run(['git', 'ls-files'], { cwd: projectRoot, timeoutMs: 3000 })
    .catch(() => undefined)
  const files = (listing?.stdout ?? '').split('\n').slice(0, 200).join('\n')
  const reply = await complete($, { system: ROUND_SYSTEM, prompt: roundPrompt({ mode: round.mode, task: round.prompt, files }), maxTokens: 1200 })
  setQuestions({ roundId: round.id, questions: reply === undefined ? null : parseQuestions(reply) })
  $.ui.invalidate('ui.render')
}

async function runChat($: EngineInterface): Promise<void> {
  const { chat, lastTask } = grillView()
  const reply = await complete($, { system: CHAT_SYSTEM, prompt: chatPrompt({ task: lastTask, chat }), maxTokens: 500 })
  addChatMessage({ role: 'partner', text: reply ?? 'I could not answer just now. Say that again in a moment.' })
  $.ui.invalidate('ui.render')
}

async function runShare($: EngineInterface): Promise<void> {
  const { chat } = grillView()
  if (chat.length === 0) {
    $.ui.toast('The side chat is empty, so there is nothing to share')
    return
  }
  const notes = await complete($, { system: CHAT_SYSTEM, prompt: sharePrompt(chat), maxTokens: 400 })
  if (notes === undefined) {
    $.ui.toast('The notes could not be written. Try Share again.')
    return
  }
  await $.prompt.fill({ text: `Notes from my side chat:\n${notes}\n`, mode: 'insert' })
  $.ui.toast('The notes are in your prompt. Edit them and press Enter to send.')
}

async function runJob($: EngineInterface): Promise<void> {
  if (isBusy) {
    return
  }
  const job = takeJob()
  if (!job) {
    return
  }
  isBusy = true
  if (job.kind === 'round') {
    await runRound($, { roundId: job.roundId }).catch(noop)
  } else if (job.kind === 'chat') {
    await runChat($).catch(noop)
  } else {
    await runShare($).catch(noop)
  }
  isBusy = false
}

export const register: Register = (on, options) => {
  const model = options.helperModel
  configureGrill({ helperModel: typeof model === 'string' && model.trim() !== '' ? model.trim() : 'haiku' })
  installQuestions(on)
  installChat(on)

  on('session.start', async ($, e, next) => {
    projectRoot = e.cwd
    await $.command.register({
      name: 'grill',
      description: 'Grill: questions while Claude works. grill, brainstorm, or off sets the mode; ask or ideas runs a round now; chat opens a side chat.',
      argumentHint: '[grill|brainstorm|off|ask|ideas|chat]',
      immediate: true,
    })
    setMode(modeFrom(await $.store.get(MODE_KEY)) ?? modeFrom(options.startMode) ?? 'grill')
    $.clock.every(JOB_POLL_MS, () => {
      runJob($).catch(noop)
    })
    return next(e)
  })

  on('command.run', { command: 'grill' }, async ($, e) => {
    const action = e.args.trim().toLowerCase()
    const mode = modeFrom(action)
    if (mode) {
      setMode(mode)
      await $.store.set(MODE_KEY, mode)
      $.ui.invalidate('ui.render')
      return { text: mode === 'off' ? 'Grill is off. /grill ask still runs a round on demand.' : `Grill mode: ${mode}. It starts on your next task prompt.` }
    }
    if (action === 'chat') {
      await $.ui.open({ id: CHAT_PANE, title: 'Side chat', focus: true, closeOnEscape: true })
      return { text: 'Side chat opened. Claude does not see it until you press Share with Claude.' }
    }
    if (action === 'ask' || action === 'ideas') {
      const task = grillView().lastTask
      if (task === '') {
        return { text: 'There is no task yet. Send Claude a task first, then run /grill ask.' }
      }
      startRound({ prompt: task, mode: action === 'ask' ? 'grill' : 'brainstorm' })
      $.ui.invalidate('ui.render')
      return { text: 'Questions about your last task are on the way.' }
    }
    return { text: `Grill mode: ${grillView().mode}. Use /grill grill, brainstorm, off, ask, ideas, or chat.` }
  })
}
