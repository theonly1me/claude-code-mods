import type { Backdrop, DemonShape } from '../sim/types'

export type DemonLook = { body: number; shade: number; accent: number; eye: number }

export type Chapter = {
  place: string
  demon: string
  shape: DemonShape
  look: DemonLook
  backdrop: Backdrop
  hp: number
  opening: string
  ending: string
}

export const CHAPTERS: readonly [Chapter, ...Chapter[]] = [
  {
    place: 'The Mountain Pass',
    demon: 'the Hollow Woodcutter',
    shape: 'brute',
    look: { body: 0x6b5b4e, shade: 0x40352c, accent: 0xc9c2b8, eye: 0xff3b3b },
    backdrop: 'snow',
    hp: 40,
    opening: 'Snow fills the pass. A woodcutter who stopped being human waits at the treeline.',
    ending: 'The axe falls into the snow, and the woodcutter turns to ash with it.',
  },
  {
    place: 'The Lantern Market',
    demon: 'the Paper Lantern Demon',
    shape: 'lantern',
    look: { body: 0xd62828, shade: 0x8a1c1c, accent: 0xffb703, eye: 0xfff3b0 },
    backdrop: 'market',
    hp: 55,
    opening: 'In the night market, one lantern has teeth.',
    ending: 'The lantern gutters out. The market lights stay on.',
  },
  {
    place: 'The Drum House',
    demon: 'the Taiko Ghoul',
    shape: 'brute',
    look: { body: 0x7b4fa0, shade: 0x4a2c66, accent: 0xe9c46a, eye: 0xffd166 },
    backdrop: 'hall',
    hp: 70,
    opening: 'Every drumbeat turns the house. The rooms will not stay still.',
    ending: 'The last drum splits. The rooms settle back into place.',
  },
  {
    place: 'Thread Wood',
    demon: 'the Thread Weaver',
    shape: 'spider',
    look: { body: 0xe9e4f0, shade: 0x9d94ad, accent: 0xff4d6d, eye: 0xff4d6d },
    backdrop: 'forest',
    hp: 85,
    opening: 'The forest is strung with thread, and something pulls it from the dark.',
    ending: 'The threads go slack. The forest breathes again.',
  },
  {
    place: 'The Night Train',
    demon: 'the Sleep Conductor',
    shape: 'lanky',
    look: { body: 0x2b4170, shade: 0x18264a, accent: 0xb8c0ff, eye: 0x9bf6ff },
    backdrop: 'train',
    hp: 100,
    opening: 'The night train runs on dreams. Wake up, or ride forever.',
    ending: 'The conductor punches his last ticket. Everyone on the train wakes up.',
  },
  {
    place: 'The Lantern Quarter',
    demon: 'the Sash Dancer',
    shape: 'lanky',
    look: { body: 0xf28482, shade: 0xb5485b, accent: 0xffd6e0, eye: 0xfff3b0 },
    backdrop: 'town',
    hp: 120,
    opening: 'Silk sashes slip through the lantern quarter and cut like blades.',
    ending: 'The sashes drift down, soft and harmless, like any silk.',
  },
  {
    place: 'The Hot Spring Village',
    demon: 'the Vase Hoarder',
    shape: 'vase',
    look: { body: 0x4cc9f0, shade: 0x277da1, accent: 0xf8f9fa, eye: 0xffd60a },
    backdrop: 'forest',
    hp: 140,
    opening: 'Steam rises over the swordsmiths. A collector wants their blades for his vases.',
    ending: 'The vases crack one by one. The swordsmiths go back to their forges.',
  },
  {
    place: 'Upper Moon Six',
    demon: 'the Twin Sickles',
    shape: 'moon',
    look: { body: 0x2d6a4f, shade: 0x1b4332, accent: 0xb7e4c7, eye: 0xffd60a },
    backdrop: 'town',
    hp: 160,
    opening: 'The first Upper Moon steps out of the alley, a sickle in each hand.',
    ending: 'Both sickles fall. Upper Moon Six is gone.',
  },
  {
    place: 'Upper Moon Four',
    demon: 'the Mirror Monk',
    shape: 'moon',
    look: { body: 0xe9c46a, shade: 0xa47e1b, accent: 0xffffff, eye: 0xd62828 },
    backdrop: 'hall',
    hp: 180,
    opening: 'A monk with a mirror shows each slayer their worst night. They keep fighting.',
    ending: 'The mirror shatters, and every reflection with it.',
  },
  {
    place: 'Upper Moon Three',
    demon: 'the Frost Lotus',
    shape: 'moon',
    look: { body: 0xbde0fe, shade: 0x6c8ebf, accent: 0xffffff, eye: 0x3a86ff },
    backdrop: 'snow',
    hp: 200,
    opening: 'Ice lotuses bloom wherever the Frost Lotus steps. The cold is the weapon.',
    ending: 'The lotuses melt. The snow is only snow again.',
  },
  {
    place: 'Upper Moon One',
    demon: 'the Crescent Ronin',
    shape: 'moon',
    look: { body: 0x5a189a, shade: 0x3c096c, accent: 0xe0aaff, eye: 0xff006e },
    backdrop: 'castle',
    hp: 230,
    opening: 'Six eyes open in the Infinity Castle. The strongest Moon draws a crescent blade.',
    ending: 'The crescent blade breaks. Only one demon is left.',
  },
  {
    place: 'The Infinity Castle',
    demon: 'Muzan Kibutsuji',
    shape: 'muzan',
    look: { body: 0x111111, shade: 0x2b2b2b, accent: 0xeae2e2, eye: 0xff0033 },
    backdrop: 'castle',
    hp: 300,
    opening: 'The castle folds around the Corps. At its heart, Muzan waits for a sun that never rises.',
    ending: 'The sun rises over the castle. Muzan is gone.',
  },
]

export function chapterAt(index: number): Chapter {
  return CHAPTERS[Math.min(CHAPTERS.length - 1, Math.max(0, index))] ?? CHAPTERS[0]
}

export function maxHpFor(options: { chapter: number; cycle: number }): number {
  return Math.round(chapterAt(options.chapter).hp * (1 + (options.cycle - 1) * 0.5))
}
