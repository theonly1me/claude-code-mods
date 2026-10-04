import type { On } from 'claude-code'

import { noop } from '../noop'
import type { Bitmap } from './bitmap'
import { encodeCells } from './cells'

export type StageScene = {
  resize: (columns: number) => void
  tick: (dtMs: number) => void
  frame: () => Bitmap
  summary: () => string
}

export type StageOptions = {
  rasterKey: string
  rows: number
  minColumns: number
  maxColumns: number
  frameMs: number
  scene: StageScene
}

export const STAGE_HIDDEN_KEY = 'stage:isHidden'
const SUMMARY_REFRESH_MS = 1000

let stage: StageOptions | undefined
let bandRequestId: string | undefined
let isRasterMounted = false
let isSummaryShown = false
let isClockRunning = false
let isHidden = false
let lastCells = ''
let lastSummary = ''
let sinceSummaryMs = 0

export function configureStage(options: StageOptions): void {
  stage = options
}

export function toggleStageHidden(): boolean {
  isHidden = !isHidden
  return isHidden
}

function nextCells(scene: StageScene): string | undefined {
  if (!isRasterMounted || bandRequestId === undefined) {
    return undefined
  }
  const cells = encodeCells(scene.frame())
  if (cells === lastCells) {
    return undefined
  }
  lastCells = cells
  return cells
}

function isSummaryStale(options: { scene: StageScene; frameMs: number }): boolean {
  sinceSummaryMs += options.frameMs
  if (!isSummaryShown || sinceSummaryMs < SUMMARY_REFRESH_MS) {
    return false
  }
  sinceSummaryMs = 0
  return options.scene.summary() !== lastSummary
}

export function installStage(on: On): void {
  on('session.start', { isInteractive: true }, async ($, e, next) => {
    const options = stage
    if (!options || isClockRunning) {
      return next(e)
    }
    isClockRunning = true
    isHidden = (await $.store.get(STAGE_HIDDEN_KEY)) === true
    $.clock.every(options.frameMs, () => {
      options.scene.tick(options.frameMs)
      if (isSummaryStale({ scene: options.scene, frameMs: options.frameMs })) {
        $.ui.invalidate('ui.render')
      }
      const cells = nextCells(options.scene)
      if (cells === undefined || bandRequestId === undefined) {
        return
      }
      $.ui
        .blit({ requestId: bandRequestId, key: options.rasterKey, cells })
        .then(result => {
          if (result.deny !== undefined) {
            isRasterMounted = false
          }
        })
        .catch(noop)
    })
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    if (!stage) {
      return below
    }
    const columns = Math.min(e.props.bodyColumns, stage.maxColumns)
    const isCrowded =
      e.props.hasSurvey || e.props.maxRows < stage.rows + 2 || columns < stage.minColumns
    if (isCrowded || isHidden) {
      isRasterMounted = false
      isSummaryShown = false
      return below
    }
    if (e.surface !== 'terminal') {
      const { Box, Text } = $.ui.resolve(e)
      isRasterMounted = false
      isSummaryShown = true
      lastSummary = stage.scene.summary()
      return (
        <Box flexDirection="column">
          <Text dimColor>{lastSummary}</Text>
          {below}
        </Box>
      )
    }
    const { Box, Raster } = $.ui.resolve(e)
    stage.scene.resize(columns)
    bandRequestId = e.requestId
    isRasterMounted = true
    isSummaryShown = false
    lastCells = encodeCells(stage.scene.frame())
    return (
      <Box flexDirection="column">
        <Raster key={stage.rasterKey} columns={columns} rows={stage.rows} cells={lastCells} />
        {below}
      </Box>
    )
  })
}
