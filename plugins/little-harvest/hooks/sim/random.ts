export type Random = {
  next: () => number
  between: (range: { min: number; max: number }) => number
  pick: <T>(list: readonly [T, ...T[]]) => T
}

export function createRandom(seed: number): Random {
  let state = seed >>> 0 || 1
  const next = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
  return {
    next,
    between: range => range.min + next() * (range.max - range.min),
    pick: list => list[Math.floor(next() * list.length)] ?? list[0],
  }
}
