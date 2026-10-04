export function sentence(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function createLog(limit: number) {
  let lines: string[] = []

  return {
    add(text: string): void {
      lines = [sentence(text), ...lines].slice(0, limit)
    },
    lines(): readonly string[] {
      return lines
    },
  }
}

export type ActivityLog = ReturnType<typeof createLog>
