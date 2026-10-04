const EM_DASH = String.fromCodePoint(0x2014)
const EN_DASH = String.fromCodePoint(0x2013)

const PHRASES: readonly { pattern: RegExp; word: string }[] = [
  { pattern: /\bdelv(?:e|es|ing)\b/i, word: 'delve' },
  { pattern: /\bleverag(?:e|es|ed|ing)\b/i, word: 'leverage' },
  { pattern: /\brobust(?:ly|ness)?\b/i, word: 'robust' },
  { pattern: /\bseamless(?:ly)?\b/i, word: 'seamless' },
  { pattern: /\bcomprehensive(?:ly)?\b/i, word: 'comprehensive' },
  { pattern: /\b(?:it'?s|it is) worth (?:noting|mentioning)\b/i, word: 'it is worth noting' },
  { pattern: /\bin conclusion\b/i, word: 'in conclusion' },
  { pattern: /\bcutting[ -]edge\b/i, word: 'cutting-edge' },
  { pattern: /\bgame[ -]changer\b/i, word: 'game-changer' },
  { pattern: /\bever[ -]evolving\b/i, word: 'ever-evolving' },
  { pattern: /\btapestry\b/i, word: 'tapestry' },
  { pattern: /\btestament to\b/i, word: 'testament to' },
  { pattern: /\bpivotal\b/i, word: 'pivotal' },
  { pattern: /\bcrucial(?:ly)?\b/i, word: 'crucial' },
  { pattern: /\bstreamlin(?:e|es|ed|ing)\b/i, word: 'streamline' },
  { pattern: /\bempower(?:s|ed|ing)?\b/i, word: 'empower' },
  { pattern: /\bunleash(?:es|ed|ing)?\b/i, word: 'unleash' },
  { pattern: /\belevat(?:e|es|ing) (?:your|the|our)\b/i, word: 'elevate' },
  { pattern: /\bin today'?s (?:fast-paced|digital|modern)\b/i, word: "in today's" },
  { pattern: /\bnavigat(?:e|ing) the (?:complexities|landscape|intricacies)\b/i, word: 'navigate the complexities' },
  { pattern: /\b(?:a myriad of|a plethora of)\b/i, word: 'a myriad of' },
  { pattern: /\brest assured\b/i, word: 'rest assured' },
]
const EMOJI = /\p{Extended_Pictographic}/u

export function hasDash(line: string): boolean {
  return line.includes(EM_DASH) || line.includes(EN_DASH)
}

export function dashName(line: string): string {
  return line.includes(EM_DASH) ? 'em dash' : 'en dash'
}

export function phraseIn(text: string): string | undefined {
  return PHRASES.find(phrase => phrase.pattern.test(text))?.word
}

export function hasEmoji(text: string): boolean {
  return EMOJI.test(text)
}

export function isProseHeadingOrBullet(line: string): boolean {
  return /^\s*(?:#{1,6}\s|[-*+]\s|\d+\.\s)/.test(line)
}
