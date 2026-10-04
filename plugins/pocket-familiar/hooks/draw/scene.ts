import type { Bitmap } from '../shared/pixel/bitmap'
import { isAmbientAllowed } from '../sim/ambient'
import { growthOf } from '../sim/growth'
import { foxPoseOf } from '../sim/pose'
import type { FamiliarState } from '../sim/types'
import { drawAmbient, drawButterfly, drawMouth } from './ambient'
import { drawBackdrop } from './backdrop'
import { drawDetails } from './details'
import { drawFamiliar } from './fox'
import type { Placement } from './fox'
import { drawHud } from './hud'
import { drawFireflies } from './sky'

const EGG_BUTTERFLY = 0xffd43b

function drawEggCompanion(options: { bitmap: Bitmap; state: FamiliarState; placement: Placement }): void {
  const { bitmap, state, placement } = options
  if (state.isSleeping) {
    return
  }
  drawButterfly({
    bitmap,
    at: {
      x: placement.x + 3 + Math.cos(state.clockMs / 700) * 8,
      y: placement.top + 1 + Math.sin(state.clockMs / 450) * 2,
    },
    ms: state.clockMs,
    color: EGG_BUTTERFLY,
  })
}

export function drawScene(options: { bitmap: Bitmap; state: FamiliarState }): void {
  const { bitmap, state } = options
  const daylight = drawBackdrop({ bitmap, hour: state.hour, clockMs: state.clockMs })
  drawFireflies({ bitmap, daylight, clockMs: state.clockMs })
  drawHud({ bitmap, stats: state.stats })
  const pose = foxPoseOf(state)
  const growth = growthOf(state.lifetimeXp)
  const placement = drawFamiliar({ bitmap, state, pose })
  if (growth.form === 'egg') {
    drawEggCompanion({ bitmap, state, placement })
  } else {
    drawMouth({ bitmap, placement, pose, isKit: growth.form === 'kit' })
  }
  if (isAmbientAllowed(state)) {
    drawAmbient({ bitmap, state, placement, daylight })
  }
  drawDetails({ bitmap, state, placement, isNapping: pose.isNapping })
}
