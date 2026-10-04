export type KillTally = { codex: number; gemini: number; chatgpt: number }

declare module 'claude-code' {
  interface PluginState {
    'samurai-dojo': { tally: KillTally }
  }
}
