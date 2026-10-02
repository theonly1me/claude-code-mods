import type { Activity } from './activity'
import type { Game } from './game/model'
import { createGame, advanceGame, buildPlatform, gameTestResult } from './game/model'
import { restoreGame } from './game/restore'
import type { Progress } from './progress'
import { emptyProgress, petStage } from './progress'
import type { SceneName } from './scene'

export type World = { activity: Activity; tick: number; activityUntil: number; pending: number; completed: number; harvests: number; kills: number; crops: number; beds: number[]; celebration: number; game: Game; working: boolean; contributions: Progress }

export function createWorld(): World {
  return { activity: 'idle', tick: 0, activityUntil: 0, pending: 0, completed: 0, harvests: 0, kills: 0, crops: 0, beds: [], celebration: 0, game: createGame(), working: false, contributions: { ...emptyProgress } }
}

export function snapshotWorld(world: World): World {
  return { ...world, beds: [...world.beds], contributions: { ...world.contributions }, game: restoreGame(world.game) }
}

export function restoreWorld(options: { world: World; snapshot: World }): void {
  const { world, snapshot } = options
  const totals = { completed: Math.max(world.completed, snapshot.completed), harvests: Math.max(world.harvests, snapshot.harvests), kills: Math.max(world.kills, snapshot.kills) }
  Object.assign(world, snapshotWorld(snapshot), totals, { pending: 0 })
}

export function beginWorld(world: World): void {
  world.working = true
  world.activity = 'thinking'
  world.crops = 1
}

export function finishWorld(options: { world: World; successful: boolean }): void {
  const { world } = options
  if (!world.working) return
  world.working = false
  world.activity = 'idle'
  if (!options.successful) { if (world.crops > 0) world.beds.push(Math.min(3, world.crops)); world.beds = world.beds.slice(-4); return }
  world.completed += 1
  world.harvests += 4
  world.contributions.completed += 1
  world.contributions.harvests += 4
  world.beds.push(4)
  world.beds = world.beds.slice(-4)
  world.crops = 4
  world.celebration = 30
}

export function finishActivity(options: { world: World; activity: Activity; successful: boolean; testEdit?: boolean; denied?: boolean }): void {
  const { world } = options
  world.activityUntil = world.tick + 15
  if (world.working) world.crops = Math.min(3, world.crops + 0.25)
  if (options.testEdit && options.successful) buildPlatform(world.game)
  if (options.activity === 'testing' && !options.denied) gameTestResult({ game: world.game, passed: options.successful })
}

export function advanceWorld(options: { world: World; playing: boolean }): void {
  options.world.tick += 1
  if (options.world.working && options.world.pending === 0 && options.world.tick > options.world.activityUntil) options.world.activity = 'thinking'
  options.world.celebration = Math.max(0, options.world.celebration - 1)
  advanceGame({ game: options.world.game, milliseconds: 80, automatic: !options.playing && options.world.working })
}

export function worldDescription(options: { world: World; scene: SceneName }): string {
  const { world, scene } = options
  if (scene === 'night-feast') return `${world.game.meals} humans eaten · ${world.game.platforms.length} platforms`
  if (scene === 'little-harvest') return `${world.harvests} harvested · ${world.completed} turns`
  if (scene === 'samurai-dojo') return `${world.kills} aliens defeated · ${world.completed} turns`
  return `${petStage(world.completed)} companion · ${world.completed} completed turns`
}
