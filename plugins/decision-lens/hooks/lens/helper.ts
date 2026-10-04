import type { ModelEffort, PluginOptions } from 'claude-code'

export const DEFAULT_HELPER_MODEL = 'claude-sonnet-5-5'

const EFFORTS: readonly ModelEffort[] = ['low', 'medium', 'high']

export type Helper = { helperModel: string; helperEffort: ModelEffort }

export function helperFrom(options: PluginOptions): Helper {
  const model = options.helperModel
  return {
    helperModel: typeof model === 'string' && model.trim() !== '' ? model.trim() : DEFAULT_HELPER_MODEL,
    helperEffort: EFFORTS.find(effort => effort === options.helperEffort) ?? 'medium',
  }
}
