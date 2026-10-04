export const FRAME_MS = 40
export const STAGE_ROWS = 8
export const STAGE_HEIGHT = STAGE_ROWS * 2
export const MIN_COLUMNS = 44
export const MAX_COLUMNS = 72
export const FLOOR_TOP = 13
export const FEET_Y = 12

export const HOME_X = 17
export const VILLAGE_LEFT = 22
export const CASTLE_WIDTH = 18
export const MOON_LEFT = 22
export const MOON_RIGHT_MARGIN = 26

export const BAT_SPEED_PIXELS_PER_SECOND = 70
export const VILLAGER_SPEED_PIXELS_PER_SECOND = 6
export const DIZZY_SPEED_PIXELS_PER_SECOND = 9
export const POOF_MS = 260
export const FEED_MS = 700
export const RECOIL_MS = 650
export const PERCH_MS = 2400
export const RECOIL_PIXELS = 4
export const WALK_FRAME_MS = 260

export const FEED_BLOOD = 14
export const GARLIC_BLOOD = 18
export const HUNGER_MS = 15000
export const MAX_QUEUED_FEEDS = 6
export const MIN_VILLAGERS = 2
export const MAX_VILLAGERS = 4

export const WARM_PERCENT = 80
export const DAWN_PERCENT = 90
export const NEW_NIGHT_DROP = 25
export const VIAL_DROP_X = 2
export const VIAL_BOTTOM_Y = 9
export const FLEE_SPEED_PIXELS_PER_SECOND = 14
export const STALK_SPEED_PIXELS_PER_SECOND = 9
export const CRUISE_SPEED_PIXELS_PER_SECOND = 34
export const IDLE_BETWEEN_MS = 900
export const LOG_LIMIT = 8
export const OWL_TREE_X = 10

export const HOUSES: readonly { offset: number; width: number; door: number }[] = [
  { offset: 1, width: 7, door: 3 },
  { offset: 10, width: 9, door: 4 },
  { offset: 21, width: 7, door: 3 },
]
