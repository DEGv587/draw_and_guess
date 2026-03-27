import type { GameRoomState, PlayerState } from '../shared/types'

/** 将 GameRoomState（含 Map）序列化为可存储的 plain object */
export function serializeState(state: GameRoomState) {
  return {
    ...state,
    players: Object.fromEntries(state.players),
    guessedPlayers: Object.fromEntries(state.guessedPlayers),
  }
}

/** 将存储中的 plain object 还原为 GameRoomState（含 Map） */
export function deserializeState(stored: GameRoomState): GameRoomState {
  const rawGuessed = stored.guessedPlayers as unknown
  // 兼容旧数据（string[]）和新数据（Record<string, {score, ratio}>）
  let guessedMap: Map<string, { score: number; ratio: number }>
  if (Array.isArray(rawGuessed)) {
    guessedMap = new Map((rawGuessed as string[]).map((id) => [id, { score: 0, ratio: 0 }]))
  } else if (rawGuessed && typeof rawGuessed === 'object') {
    guessedMap = new Map(Object.entries(rawGuessed as Record<string, { score: number; ratio: number }>))
  } else {
    guessedMap = new Map()
  }
  return {
    ...stored,
    players: new Map(Object.entries(stored.players as unknown as Record<string, PlayerState>)),
    guessedPlayers: guessedMap,
  }
}
