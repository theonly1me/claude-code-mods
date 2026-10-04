export type NightSession = { feeds: number; garlic: number; night: number }

declare module 'claude-code' {
  interface PluginState {
    'night-feast': { session: NightSession }
  }
}
