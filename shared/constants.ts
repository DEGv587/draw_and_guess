export const GAME_CONSTANTS = {
  MAX_PLAYERS: 10,
  MIN_PLAYERS: 2,
  DEFAULT_SEATS: 6,
  SEAT_COUNT_OPTIONS: [2, 3, 4, 5, 6, 7, 8, 9, 10] as const,
  DEFAULT_ROUNDS: 3,
  MIN_ROUNDS: 1,
  MAX_ROUNDS: 10,
  DEFAULT_DRAW_TIME: 60,
  DRAW_TIME_OPTIONS: [30, 60, 90, 120] as const,
  CHOOSE_WORD_TIME: 15,
  ROUND_END_DISPLAY_TIME: 4,
  RECONNECT_WINDOW: 30,
  WORD_CHOICES_COUNT: 3,
  HINT_REVEAL_RATIO: 0.5,

  // 计分
  BASE_SCORE: 50,
  TIME_BONUS_MAX: 50,
  DRAWER_PER_GUESS_SCORE: 25,
  DRAWER_TIME_BONUS_MAX: 25,

  // 屎粑粑道具
  POOP_EFFECT_DURATION: 3,
  SEAT_POOP_MIN: 1,
  SEAT_POOP_MAX: 3,

  // 词库模式
  WORD_MODES: ['random', 'custom'] as const,

  // 词库分类
  WORD_CATEGORIES: [
    'animals', 'food', 'daily', 'sports',
    'nature', 'occupations', 'places', 'actions',
  ] as const,

  // 词库分类中文名
  WORD_CATEGORY_NAMES: {
    animals: '动物',
    food: '食物',
    daily: '日常用品',
    sports: '运动',
    nature: '自然',
    occupations: '职业',
    places: '地点',
    actions: '动作',
  } as const,
} as const

export type WordCategory = typeof GAME_CONSTANTS.WORD_CATEGORIES[number]
