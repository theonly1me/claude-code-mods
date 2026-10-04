import type { AttackKind, Particle, ParticleKind } from './types'

type Burst = { kind: ParticleKind; count: number; colors: readonly number[]; speed: number; lifeMs: number; spread: number; rise: number }

const BURSTS: Record<AttackKind, Burst> = {
  water: { kind: 'water', count: 14, colors: [0xcaf0f8, 0x48cae4, 0x0096c7], speed: 36, lifeMs: 520, spread: Math.PI, rise: 0 },
  flame: { kind: 'ember', count: 14, colors: [0xffc2d1, 0xff4d6d, 0xc9184a], speed: 24, lifeMs: 600, spread: Math.PI * 2, rise: 18 },
  thunder: { kind: 'spark', count: 10, colors: [0xffffff, 0xfff3b0, 0xffd60a], speed: 44, lifeMs: 320, spread: Math.PI * 2, rise: 0 },
  beast: { kind: 'blade', count: 10, colors: [0xf1f3f5, 0xadb5bd, 0x6c757d], speed: 30, lifeMs: 360, spread: Math.PI * 2, rise: 0 },
  blaze: { kind: 'ember', count: 20, colors: [0xfff3b0, 0xffba08, 0xe85d04, 0xd00000], speed: 34, lifeMs: 700, spread: Math.PI * 2, rise: 14 },
  sun: { kind: 'ember', count: 28, colors: [0xffffff, 0xffd166, 0xf77f00, 0xd62828], speed: 30, lifeMs: 900, spread: Math.PI * 2, rise: 6 },
}

function ring(options: { burst: Burst; x: number; y: number; seed: number }): Particle[] {
  const { burst } = options
  return Array.from({ length: burst.count }, (_, index) => {
    const angle = -Math.PI / 2 - burst.spread / 2 + (burst.spread * (index + 0.5)) / burst.count
    const jitter = 0.6 + ((options.seed * 31 + index * 17) % 10) / 25
    return {
      kind: burst.kind,
      x: options.x,
      y: options.y,
      velocityX: Math.cos(angle) * burst.speed * jitter,
      velocityY: Math.sin(angle) * burst.speed * jitter - burst.rise,
      ageMs: 0,
      lifeMs: burst.lifeMs,
      color: burst.colors[index % burst.colors.length] ?? 0xffffff,
    }
  })
}

export function attackBurst(options: { kind: AttackKind; x: number; y: number; seed: number }): Particle[] {
  return ring({ burst: BURSTS[options.kind], x: options.x, y: options.y, seed: options.seed })
}

export function clawBurst(options: { x: number; y: number }): Particle[] {
  return [0, 1, 2].flatMap(stripe =>
    [0, 1, 2, 3].map(step => ({
      kind: 'claw' as const,
      x: options.x + stripe * 2 + step,
      y: options.y + step * 2,
      velocityX: 0,
      velocityY: 0,
      ageMs: 0,
      lifeMs: 260,
      color: stripe === 1 ? 0xff2e2e : 0x9d0208,
    })),
  )
}

export function ashBurst(options: { x: number; y: number; width: number; height: number; seed: number }): Particle[] {
  return Array.from({ length: 30 }, (_, index) => ({
    kind: 'ash' as const,
    x: options.x + ((options.seed * 13 + index * 7) % options.width),
    y: options.y + ((options.seed * 5 + index * 11) % options.height),
    velocityX: ((index % 5) - 2) * 3,
    velocityY: -6 - (index % 4) * 3,
    ageMs: -(index % 6) * 120,
    lifeMs: 1500,
    color: [0x6c757d, 0x343a40, 0x212529, 0xadb5bd][index % 4] ?? 0x343a40,
  }))
}

export function advanceParticles(options: { particles: Particle[]; dtMs: number }): Particle[] {
  return options.particles
    .map(particle => {
      const isStarted = particle.ageMs >= 0
      const seconds = options.dtMs / 1000
      return {
        ...particle,
        ageMs: particle.ageMs + options.dtMs,
        x: isStarted ? particle.x + particle.velocityX * seconds : particle.x,
        y: isStarted ? particle.y + particle.velocityY * seconds : particle.y,
        velocityY: particle.kind === 'ember' || particle.kind === 'ash' ? particle.velocityY : particle.velocityY + 30 * seconds,
      }
    })
    .filter(particle => particle.ageMs < particle.lifeMs)
}

export function parryBurst(options: { x: number; y: number; seed: number }): Particle[] {
  return Array.from({ length: 14 }, (_, index) => {
    const angle = Math.PI * 0.5 + (Math.PI * index) / 13
    const speed = 30 + ((options.seed + index * 13) % 5) * 5
    return {
      kind: 'parry' as const,
      x: options.x,
      y: options.y + (index % 3) - 1,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed * 0.6 - 10,
      ageMs: 0,
      lifeMs: 360,
      color: [0xffffff, 0xfff3b0, 0xffd60a][index % 3] ?? 0xffffff,
    }
  })
}
