import type { Color } from './bitmap'

export const WHITE: Color = 0xffffff

function channelsOf(color: Color): { red: number; green: number; blue: number } {
  return { red: (color >> 16) & 255, green: (color >> 8) & 255, blue: color & 255 }
}

export function mixColors(options: { from: Color; to: Color; amount: number }): Color {
  const amount = Math.min(1, Math.max(0, options.amount))
  const from = channelsOf(options.from)
  const to = channelsOf(options.to)
  const blend = (start: number, end: number): number =>
    Math.round(start + (end - start) * amount)
  return (
    (blend(from.red, to.red) << 16) |
    (blend(from.green, to.green) << 8) |
    blend(from.blue, to.blue)
  )
}

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function lerp(options: { from: number; to: number; amount: number }): number {
  return options.from + (options.to - options.from) * options.amount
}
