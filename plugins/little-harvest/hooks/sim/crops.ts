import { GROWING_LINES, RIPE_LINES, SPROUT_LINES } from './constants'
import type { CropKind, GrowthStage } from './types'

const TEST_PATH = /(^|\/)(tests?|__tests__|spec)\/|[._-](test|spec)\.[a-z0-9]+$/i
const DOC_PATH = /\.(md|mdx|markdown|rst|txt|adoc)$|(^|\/)(docs?|LICENSE|README)[^/]*$/i
const STYLE_PATH = /\.(css|scss|sass|less|styl|pcss)$/i
const CONFIG_PATH = /\.(json|jsonc|ya?ml|toml|ini|env|lock|config\.[cm]?[jt]s)$|(^|\/)\.[a-z]+rc$|(^|\/)(Dockerfile|Makefile)$/i
const SOURCE_PATH = /\.(ts|tsx|js|jsx|mjs|cjs|py|rb|go|rs|java|kt|swift|c|h|cc|cpp|hpp|cs|php|scala|ex|exs|lua|dart|vue|svelte|sh|sql|zig)$/i

export const CROP_LABELS: Record<CropKind, string> = {
  pumpkin: 'pumpkin',
  corn: 'corn',
  sunflower: 'sunflower',
  tulip: 'tulip',
  wheat: 'wheat',
  carrot: 'carrot',
}

export function cropForPath(path: string): CropKind {
  if (TEST_PATH.test(path)) {
    return 'pumpkin'
  }
  if (DOC_PATH.test(path)) {
    return 'sunflower'
  }
  if (STYLE_PATH.test(path)) {
    return 'tulip'
  }
  if (CONFIG_PATH.test(path)) {
    return 'wheat'
  }
  return SOURCE_PATH.test(path) ? 'corn' : 'carrot'
}

export function stageForLines(lines: number): GrowthStage {
  if (lines >= RIPE_LINES) {
    return 'ripe'
  }
  if (lines >= GROWING_LINES) {
    return 'growing'
  }
  return lines >= SPROUT_LINES ? 'sprout' : 'seed'
}

const TEST_COMMAND =
  /(^|[\s;&|(])(npm|pnpm|yarn|bun)\s+(run\s+)?(test|check|vitest|jest)\b|(^|[\s;&|(])(npx\s+)?(vitest|jest|mocha|ava|playwright\s+test|pytest|tox|rspec|phpunit)\b|(^|[\s;&|(])(go|cargo|deno|swift|dotnet|mix|gradle|mvn)\s+test\b|(^|[\s;&|(])node\s+(--test\b|\S*\.test\.[cm]?[jt]s)|(^|[\s;&|(])claude\s+plugin\s+test\b|(^|[\s;&|(])make\s+(test|check)\b|python3?\s+-m\s+(pytest|unittest)\b/

export function isTestCommand(command: string): boolean {
  return TEST_COMMAND.test(command)
}
