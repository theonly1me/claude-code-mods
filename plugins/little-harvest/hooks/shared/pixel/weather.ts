import { setPixel } from './bitmap'
import type { Bitmap, Color } from './bitmap'
import type { ParticleKind, Season } from './seasons'

export type Area = { x: number; y: number; width: number; height: number }

type Particle = {
  kind: ParticleKind
  x: number
  y: number
  speedX: number
  speedY: number
  phase: number
  color: Color
  ageMs: number
  lifeMs: number
  restMs: number
}

type KindStyle = { perSecond: number; fallMin: number; fallMax: number; restMs: number; fromSources: number }

const REFERENCE_WIDTH = 72

const STYLES: Record<ParticleKind, KindStyle> = {
  snow: { perSecond: 2.6, fallMin: 3, fallMax: 6, restMs: 4500, fromSources: 0 },
  petal: { perSecond: 1.8, fallMin: 4, fallMax: 7, restMs: 5000, fromSources: 0.6 },
  firefly: { perSecond: 0.9, fallMin: 0, fallMax: 0, restMs: 0, fromSources: 0 },
  leaf: { perSecond: 1.4, fallMin: 6, fallMax: 10, restMs: 9000, fromSources: 0.75 },
}

function seeded(seed: number): () => number {
  let state = seed >>> 0 || 1
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

export function createWeather(options: { seed: number; density?: number }) {
  const random = seeded(options.seed)
  const density = options.density ?? 1
  let particles: Particle[] = []
  let spawnDebt = 0

  function pick<T>(list: readonly [T, ...T[]]): T {
    return list[Math.floor(random() * list.length)] ?? list[0]
  }

  function spawn(spawnOptions: { season: Season; width: number; groundY: number; sources: readonly Area[] }): void {
    const { season, width, groundY, sources } = spawnOptions
    const kind = season.particle
    const style = STYLES[kind]
    const source = random() < style.fromSources ? sources[Math.floor(random() * sources.length)] : undefined
    const base = {
      kind,
      phase: random() * Math.PI * 2,
      color: pick(season.palette.particles),
      ageMs: 0,
      restMs: 0,
    }
    if (kind === 'firefly') {
      particles.push({
        ...base,
        x: random() * width,
        y: 2 + random() * Math.max(1, groundY - 4),
        speedX: (random() - 0.5) * 4,
        speedY: (random() - 0.5) * 2,
        lifeMs: 6000 + random() * 5000,
      })
      return
    }
    particles.push({
      ...base,
      x: source ? source.x + random() * source.width : random() * (width + 12),
      y: source ? source.y + random() * source.height : -1,
      speedX: kind === 'snow' ? 0 : -1.5 - random() * 2.5,
      speedY: style.fallMin + random() * (style.fallMax - style.fallMin),
      lifeMs: Number.POSITIVE_INFINITY,
    })
  }

  function move(moveOptions: { particle: Particle; dtMs: number; groundY: number }): void {
    const { particle, dtMs, groundY } = moveOptions
    const seconds = dtMs / 1000
    particle.ageMs += dtMs
    if (particle.restMs > 0) {
      particle.restMs -= dtMs
      return
    }
    const sway = Math.sin(particle.ageMs / 420 + particle.phase)
    if (particle.kind === 'firefly') {
      particle.speedX += (Math.sin(particle.ageMs / 900 + particle.phase) - particle.speedX * 0.3) * seconds
      particle.speedY += (Math.cos(particle.ageMs / 700 + particle.phase) - particle.speedY * 0.4) * seconds
      particle.x += particle.speedX * seconds * 3
      particle.y = Math.min(groundY - 2, Math.max(1, particle.y + particle.speedY * seconds * 2))
      return
    }
    const flutter = particle.kind === 'snow' ? 1.6 : particle.kind === 'petal' ? 3.5 : 5
    particle.x += (particle.speedX + sway * flutter) * seconds
    particle.y += particle.speedY * seconds
    if (particle.y >= groundY - 1) {
      particle.y = groundY - 1
      particle.restMs = STYLES[particle.kind].restMs
      particle.lifeMs = particle.ageMs + particle.restMs
    }
  }

  return {
    advance(advanceOptions: {
      dtMs: number
      season: Season
      width: number
      groundY: number
      sources?: readonly Area[]
    }): void {
      const { dtMs, season, width, groundY } = advanceOptions
      const sources = advanceOptions.sources ?? []
      spawnDebt += (dtMs / 1000) * STYLES[season.particle].perSecond * density * (width / REFERENCE_WIDTH)
      while (spawnDebt >= 1) {
        spawnDebt -= 1
        spawn({ season, width, groundY, sources })
      }
      particles.forEach(particle => move({ particle, dtMs, groundY }))
      particles = particles.filter(
        particle => particle.ageMs < particle.lifeMs && particle.x > -4 && particle.x < width + 16,
      )
    },

    draw(bitmap: Bitmap): void {
      particles.forEach(particle => {
        if (particle.kind === 'firefly' && Math.sin(particle.ageMs / 260 + particle.phase) < 0.1) {
          return
        }
        setPixel({ bitmap, x: particle.x, y: particle.y, color: particle.color })
        const isWide = particle.kind === 'leaf' || (particle.kind === 'petal' && particle.restMs > 0)
        if (isWide && Math.sin(particle.ageMs / 300 + particle.phase) > 0) {
          setPixel({ bitmap, x: particle.x + 1, y: particle.y, color: particle.color })
        }
      })
    },

    count(): number {
      return particles.length
    },
  }
}

export type Weather = ReturnType<typeof createWeather>
