import type { Color } from '../shared/pixel/bitmap'

export type Rank = {
  title: string
  minimumKills: number
  bright: Color
  dark: Color
}

const RANKS: readonly [Rank, ...Rank[]] = [
  { title: 'Ronin', minimumKills: 0, bright: 0xd8372e, dark: 0x8a1c1c },
  { title: 'Hatamoto', minimumKills: 100, bright: 0x3b7dd8, dark: 0x1f4a8a },
  { title: 'Daimyo', minimumKills: 500, bright: 0x9b5de5, dark: 0x5a2d91 },
  { title: 'Shogun', minimumKills: 2000, bright: 0xf2c14e, dark: 0xa8801f },
]

export const BASE_SASH: Color = RANKS[0].bright

export function rankOf(lifetimeKills: number): Rank {
  return RANKS.reduce<Rank>(
    (current, rank) => (lifetimeKills >= rank.minimumKills ? rank : current),
    RANKS[0],
  )
}

export function nextRankOf(lifetimeKills: number): Rank | undefined {
  return RANKS.find(rank => rank.minimumKills > lifetimeKills)
}
