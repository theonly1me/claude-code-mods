import type { Bitmap } from '../shared/pixel/bitmap'
import type { FamiliarState } from '../sim/types'
import { drawBackdrop } from './backdrop'
import { drawDetails } from './details'
import { drawFamiliar } from './fox'
import { drawHud } from './hud'
import { drawFireflies } from './sky'

export function drawScene(options: { bitmap: Bitmap; state: FamiliarState }): void {
  const { bitmap, state } = options
  const daylight = drawBackdrop({ bitmap, hour: state.hour, clockMs: state.clockMs })
  drawFireflies({ bitmap, daylight, clockMs: state.clockMs })
  drawHud({ bitmap, stats: state.stats })
  const placement = drawFamiliar({ bitmap, state })
  drawDetails({ bitmap, state, placement })
}
