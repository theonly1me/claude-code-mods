const MAX_REASON_LENGTH = 320

export function lastSentences(text: string): string {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (cleaned === '') {
    return ''
  }
  const sentences = cleaned.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) ?? [cleaned]
  const tail = sentences.slice(-2).map(sentence => sentence.trim()).join(' ')
  return tail.length > MAX_REASON_LENGTH ? '…' + tail.slice(-(MAX_REASON_LENGTH - 1)) : tail
}

export type StepNarration = { text: string; thinking: string }

export function reasonFrom(narration: StepNarration): string {
  return lastSentences(narration.text) || lastSentences(narration.thinking)
}
