export type Random = () => number

export function seededRandom(seed: number): Random {
  let state = seed >>> 0 || 1
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

export function shuffled<T>(options: { items: readonly T[]; random: Random; avoidFirst?: T }): T[] {
  const result = [...options.items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(options.random() * (index + 1))
    const current = result[index]
    const other = result[swap]
    if (current !== undefined && other !== undefined) {
      result[index] = other
      result[swap] = current
    }
  }
  const [first, ...rest] = result
  if (first !== undefined && first === options.avoidFirst && rest.length > 0) {
    return [...rest, first]
  }
  return result
}
