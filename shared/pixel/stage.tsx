import type { EngineInterface, On } from 'claude-code'

import { noop } from '../noop'
import type { Bitmap } from './bitmap'
import { encodeCells } from './cells'

export type StageScene = {
  begin: (epochMs: number) => void
  resize: (columns: number) => void
  tick: (dtMs: number) => void
  frame: () => Bitmap
  summary: () => string
  log: () => readonly string[]
}

export type StageOptions = {
  game: string
  title: string
  command: { name: string; description: string; report: () => readonly string[] }
  rows: number
  minColumns: number
  maxColumns: number
  frameMs: number
  scene: StageScene
}

const POLL_MS = 1000
const PANE_COLUMNS = 62
const ACTIVE_FILE = '.claude/mods/active-game'

let stage: StageOptions | undefined
let activePath = ''
let isClockRunning = false
let isPaneOpen = false
let isRasterMounted = false
let lastCells = ''
let lastSummary = ''
let sincePollMs = 0

export function configureStage(options: StageOptions): void {
  stage = options
}

export function isStageShown(): boolean {
  return isPaneOpen
}

function wantsShow(options: { args: string; isActive: boolean }): boolean {
  if (options.args === 'on') {
    return true
  }
  return options.args === 'off' ? false : !options.isActive
}

async function readActive($: EngineInterface): Promise<string> {
  if (activePath === '') {
    return ''
  }
  return (await $.fs.read(activePath).catch(() => '')).trim()
}

export function installStage(on: On): void {
  on('session.start', { isInteractive: true }, async ($, e, next) => {
    const options = stage
    if (!options) {
      return next(e)
    }
    await $.command.register({ name: options.command.name, description: options.command.description, immediate: true })
    activePath = `${(await $.env.get('HOME')) ?? '.'}/${ACTIVE_FILE}`
    options.scene.begin(await $.clock.now())
    isPaneOpen = (await $.ui.panes()).some(pane => pane.id === options.game)
    const active = await readActive($)
    if (active === options.game && !isPaneOpen) {
      const opened = await $.ui.open({ id: options.game, title: options.title, rows: options.rows + 1, columns: PANE_COLUMNS })
      isPaneOpen = true
      if (!opened.isPlaced) {
        $.ui.toast(`${options.title} waits for a wider terminal. Run /${options.command.name} to show it now.`)
      }
    }
    if (isClockRunning) {
      return next(e)
    }
    isClockRunning = true
    $.clock.every(options.frameMs, () => {
      options.scene.tick(options.frameMs)
      sincePollMs += options.frameMs
      if (sincePollMs >= POLL_MS) {
        sincePollMs = 0
        if (isPaneOpen && options.scene.summary() !== lastSummary) {
          $.ui.invalidate('ui.render')
        }
        readActive($)
          .then(current => (isPaneOpen && current !== options.game ? $.ui.close({ id: options.game }) : undefined))
          .catch(noop)
      }
      if (!isPaneOpen || !isRasterMounted) {
        return
      }
      const cells = encodeCells(options.scene.frame())
      if (cells === lastCells) {
        return
      }
      lastCells = cells
      $.ui
        .blit({ requestId: options.game, key: `${options.game}:stage`, cells })
        .then(result => {
          if (result.deny !== undefined) {
            isRasterMounted = false
          }
        })
        .catch(noop)
    })
    return next(e)
  })

  on('command.run', { command: stage?.command.name ?? '' }, async ($, e, next) => {
    const options = stage
    if (!options || e.command !== options.command.name) {
      return next(e)
    }
    const args = e.args.trim().toLowerCase()
    if (args === 'stats') {
      return { text: options.command.report().join('\n') }
    }
    if (args !== '' && args !== 'on' && args !== 'off') {
      return { text: [`Usage: /${options.command.name} [on|off|stats]`, ...options.command.report()].join('\n') }
    }
    const pane = (await $.ui.panes()).find(candidate => candidate.id === options.game)
    const isActive = (await readActive($)) === options.game && pane?.isPlaced === true
    if (wantsShow({ args, isActive })) {
      await $.fs.write(activePath, options.game)
      await $.ui.open({ id: options.game, title: options.title, rows: options.rows + 1, columns: PANE_COLUMNS })
      isPaneOpen = true
      return {
        text: [`${options.title} is on. It comes back each session until you run /${options.command.name} again.`, ...options.command.report()].join('\n'),
      }
    }
    await $.fs.write(activePath, '')
    await $.ui.close({ id: options.game })
    isPaneOpen = false
    return { text: `${options.title} is off. Run /${options.command.name} to bring it back.` }
  })

  on('ui.close', async ($, e, next) => {
    const options = stage
    if (!options || e.id !== options.game) {
      return next(e)
    }
    const closed = await next(e)
    isPaneOpen = false
    isRasterMounted = false
    const active = await readActive($)
    if (e.origin.kind === 'person' && active === options.game) {
      await $.fs.write(activePath, '')
    }
    return closed
  })

  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    const options = stage
    if (!options || e.requestId !== options.game) {
      return next(e)
    }
    lastSummary = options.scene.summary()
    const logRows = e.props.placement === 'dock' ? Math.max(0, e.props.scroll.bodyRows - options.rows - 3) : 0
    const lines = options.scene.log().slice(0, logRows)
    if (e.surface !== 'terminal' || e.props.bodyColumns < options.minColumns) {
      const { Box, Text } = $.ui.resolve(e)
      isRasterMounted = false
      return (
        <Box flexDirection="column">
          <Text>{lastSummary}</Text>
          {e.surface === 'terminal' ? <Text dimColor>Widen this pane to see the scene.</Text> : null}
        </Box>
      )
    }
    const { Box, Raster, Text } = $.ui.resolve(e)
    const columns = Math.min(e.props.bodyColumns, options.maxColumns)
    options.scene.resize(columns)
    isRasterMounted = true
    lastCells = encodeCells(options.scene.frame())
    return (
      <Box flexDirection="column">
        <Raster key={`${options.game}:stage`} columns={columns} rows={options.rows} cells={lastCells} />
        <Text dimColor wrap="truncate">{lastSummary}</Text>
        {lines.length > 0 ? (
          <Box flexDirection="column" marginTop={1}>
            {lines.map((line, index) => (
              <Text key={`log-${index}`} dimColor={index > 0} wrap="truncate">
                {line}
              </Text>
            ))}
          </Box>
        ) : null}
      </Box>
    )
  })
}
