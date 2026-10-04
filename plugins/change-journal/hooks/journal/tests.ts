const TEST_COMMAND =
  /(^|[\s;&|(])(npm|pnpm|yarn|bun)\s+(run\s+)?(test|check|vitest|jest)\b|(^|[\s;&|(])(npx\s+)?(vitest|jest|mocha|ava|playwright\s+test|pytest|tox|rspec|phpunit)\b|(^|[\s;&|(])(go|cargo|deno|swift|dotnet|mix|gradle|mvn)\s+test\b|(^|[\s;&|(])node\s+(--test\b|\S*\.test\.[cm]?[jt]s)|(^|[\s;&|(])claude\s+plugin\s+test\b|(^|[\s;&|(])make\s+(test|check)\b|python3?\s+-m\s+(pytest|unittest)\b/

export function isTestCommand(command: string): boolean {
  return TEST_COMMAND.test(command)
}

export function isTestPath(path: string): boolean {
  return /(^|\/)(tests?|__tests__|spec)\/|[._-](test|spec)\.[a-z0-9]+$/i.test(path)
}

export function shortCommand(command: string): string {
  const firstLine = command.split('\n')[0] ?? ''
  return firstLine.length > 120 ? firstLine.slice(0, 119) + '…' : firstLine
}
