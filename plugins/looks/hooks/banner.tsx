import type { On } from 'claude-code'

import { encodeCells } from './shared/pixel/cells'
import { noop } from './shared/noop'
import { createSceneBitmap, paintScene, SCENE_HEIGHT } from './looks/scene'
import { activeChoice, currentLook, currentTone, looksSettings } from './looks/state'
import type { ThemeName } from './looks/themes'

const FRAME_MS = 100
const MIN_COLUMNS = 40
const SCENE_ROWS = SCENE_HEIGHT / 2
const SCENE_KEY = 'looks:scene'

let requestId: string | undefined
let isMounted = false
let isWorking = false
let isClockRunning = false
let elapsedMs = 0
let columns = 0
let lastCells = ''
let bitmap = createSceneBitmap(1)

function themeName(): ThemeName | undefined {
  const choice = activeChoice()
  return choice === 'off' ? undefined : choice
}

function cellsNow(): string | undefined {
  const name = themeName()
  if (!name || !isMounted || columns === 0) {
    return undefined
  }
  if (bitmap.width !== columns) {
    bitmap = createSceneBitmap(columns)
  }
  return encodeCells(paintScene({ bitmap, name, ms: elapsedMs, isWorking, isLight: currentTone() === 'light' }))
}

export function installBanner(on: On): void {
  on('session.start', { isInteractive: true }, ($, e, next) => {
    if (isClockRunning) {
      return next(e)
    }
    isClockRunning = true
    $.clock.every(FRAME_MS, () => {
      elapsedMs += FRAME_MS
      const cells = cellsNow()
      if (cells === undefined || cells === lastCells || requestId === undefined) {
        return
      }
      lastCells = cells
      $.ui
        .blit({ requestId, key: SCENE_KEY, cells })
        .then(result => {
          if (result.deny !== undefined) {
            isMounted = false
          }
        })
        .catch(noop)
    })
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const name = themeName()
    const look = currentLook()
    const width = Math.min(e.props.bodyColumns, looksSettings().readingWidth)
    if (e.surface !== 'terminal' || !name || !look || e.props.hasSurvey || e.props.maxRows < SCENE_ROWS + 3 || width < MIN_COLUMNS) {
      isMounted = false
      return below
    }
    const { Box, Raster } = $.ui.resolve(e)
    requestId = e.requestId
    columns = width
    isWorking = e.props.isWorking
    isMounted = true
    lastCells = cellsNow() ?? ''
    return (
      <Box flexDirection="column">
        <Raster key={SCENE_KEY} columns={width} rows={SCENE_ROWS} cells={lastCells} />
        {below}
      </Box>
    )
  })
}
