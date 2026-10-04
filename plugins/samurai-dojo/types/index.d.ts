export type KillTally = { codex: number; gemini: number }

declare module 'claude-code' {
  interface PluginState {
    'samurai-dojo': { tally: KillTally }
  }
}
