import type { Bitmap } from '../shared/pixel/bitmap'
import type { Cloud, Farmer, Harvest, PlotView, Pop, Weather } from '../sim/types'
import { drawCrops, drawFarmer } from './actors'
import { drawEffects, drawHud } from './hud'
import { barnX, drawLand } from './land'
import { lightAt } from './light'
import { drawClouds, drawSky } from './sky'
import { drawWeather } from './weather'

export function drawScene(options: {
  bitmap: Bitmap
  hour: number
  clouds: readonly Cloud[]
  weather: Weather
  views: readonly PlotView[]
  farmer: Farmer
  pops: readonly Pop[]
  harvest: Harvest | undefined
  bushels: number
}): void {
  const { bitmap, hour, weather } = options
  const light = lightAt(hour)
  const clockMs = options.farmer.clockMs
  const isStormy = weather.kind === 'storm'
  drawSky({ bitmap, light, hour, clockMs })
  drawClouds({ bitmap, clouds: options.clouds, light, isStormy })
  drawLand({ bitmap, light, views: options.views, isWet: isStormy })
  drawCrops({ bitmap, views: options.views, light, clockMs })
  drawFarmer({ bitmap, farmer: options.farmer, light })
  drawWeather({ bitmap, weather, hour, right: barnX(bitmap.width) - 1, light })
  drawEffects({ bitmap, pops: options.pops, harvest: options.harvest })
  drawHud({ bitmap, bushels: options.bushels })
}
