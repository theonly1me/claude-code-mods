import type { Bitmap } from '../shared/pixel/bitmap'
import type { Season } from '../shared/pixel/seasons'
import { drawSeasonTree } from '../shared/pixel/tree'
import type { Weather } from '../shared/pixel/weather'
import { TREE_GROUND_Y, TREE_X } from '../sim/constants'
import type { Critters } from '../sim/critters'
import type { Cloud, Farmer, Harvest, PlotView, Pop, TestWeather } from '../sim/types'
import { drawCrops } from './actors'
import { drawCritters, drawScarecrow } from './critters'
import { drawFarmer } from './farmer'
import { drawEffects, drawHud } from './hud'
import { barnX, drawLand } from './land'
import { seasonalLight, tintPalette } from './light'
import { drawClouds, drawSky } from './sky'
import { drawWeather } from './weather'

export function drawScene(options: {
  bitmap: Bitmap
  hour: number
  season: Season
  effects: { clouds: readonly Cloud[]; testWeather: TestWeather; pops: readonly Pop[]; harvest: Harvest | undefined }
  views: readonly PlotView[]
  scarecrowX: number | undefined
  farmer: Farmer
  critters: Critters
  weather: Weather
  bushels: number
}): void {
  const { bitmap, hour, season, effects, critters } = options
  const light = seasonalLight({ hour, season })
  const clockMs = options.farmer.clockMs
  const isStormy = effects.testWeather.kind === 'storm'
  const tinted = { ...season, palette: tintPalette({ palette: season.palette, light }) }
  drawSky({ bitmap, light, hour, clockMs, palette: season.palette })
  drawClouds({ bitmap, clouds: effects.clouds, light, isStormy })
  drawLand({ bitmap, light, views: options.views, isWet: isStormy, season })
  drawCritters({ bitmap, critters, light, layer: 'fence' })
  drawSeasonTree({ bitmap, centerX: TREE_X, groundY: TREE_GROUND_Y, season: tinted, clockMs })
  drawScarecrow({ bitmap, x: options.scarecrowX, light, clockMs })
  drawCrops({ bitmap, views: options.views, light, clockMs, season })
  drawCritters({ bitmap, critters, light, layer: 'field' })
  drawCritters({ bitmap, critters, light, layer: 'yard' })
  drawFarmer({ bitmap, farmer: options.farmer, light })
  drawWeather({ bitmap, weather: effects.testWeather, hour, right: barnX(bitmap.width) - 1, light })
  options.weather.draw(bitmap)
  drawEffects({ bitmap, pops: effects.pops, harvest: effects.harvest })
  drawHud({ bitmap, bushels: options.bushels })
}
