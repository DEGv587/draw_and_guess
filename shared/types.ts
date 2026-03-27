// ============================================================
// DrawAction — 画布操作
// ============================================================

export type DrawAction =
  | { action: 'start'; x: number; y: number; color: string; width: number }
  | { action: 'move'; x: number; y: number }
  | { action: 'end' }
  | { action: 'clear' }
  | { action: 'undo' }

// ============================================================
// WebSocket 消息协议
// ============================================================

export type ClientMessage =
  | { type: 'draw'; data: DrawAction }
  | { type: 'draw_batch'; data: DrawAction[] }
  | { type: 'guess'; word: string }
  | { type: 'chat'; message: string }
  | { type: 'ready' }
  | { type: 'start_game' }
  | { type: 'choose_word'; word: string }
  | { type: 'throw_poop'; targetId: string }
  | { type: 'reconnect'; playerId: string; roomId: string }
  | { type: 'play_again' }
  | { type: 'select_seat'; seatIndex: number }

export type ServerMessage =
  | { type: 'room_state'; data: RoomState }
  | { type: 'draw'; data: DrawAction }
  | { type: 'draw_batch'; data: DrawAction[] }
  | { type: 'guess_result'; correct: boolean; player: string }
  | { type: 'round_start'; drawer: string; hint: string; duration: number; phase: 'choosing' | 'drawing'; round: number; isNewRound: boolean }
  | { type: 'round_end'; word: string; scores: Record<string, number> }
  | { type: 'game_end'; rankings: PlayerScore[] }
  | { type: 'player_joined'; player: Player }
  | { type: 'player_left'; player: Player }
  | { type: 'chat'; player: string; message: string }
  | { type: 'choose_words'; words: string[] }
  | { type: 'hint_update'; hint: string }
  | { type: 'host_changed'; newHost: string }
  | { type: 'poop_hit'; fromPlayer: string; targetPlayer: string }
  | { type: 'error'; message: string }

// ============================================================
// 前端数据类型
// ============================================================

export interface Player {
  id: string
  name: string
  color: number
  score: number
  isReady: boolean
  isHost: boolean
  isConnected: boolean
  poopCount: number
  seatIndex: number
}

export interface PlayerScore {
  player: Player
  rank: number
  totalScore: number
}

export interface RoomState {
  roomId: string
  status: 'waiting' | 'choosing' | 'drawing' | 'round_end' | 'game_end'
  players: Player[]
  currentRound: number
  totalRounds: number
  currentDrawer: string | null
  hint: string | null
  timeLeft: number
  settings: RoomSettings
}

export interface RoomSettings {
  maxPlayers: number
  rounds: number
  drawTime: number
  wordDifficulty: 'easy' | 'medium' | 'hard'
  customWords: string[]
}

// ============================================================
// Durable Object 内部状态类型
// ============================================================

export interface GameRoomState {
  roomId: string
  status: 'waiting' | 'choosing' | 'drawing' | 'round_end' | 'game_end'
  players: Map<string, PlayerState>
  settings: RoomSettings
  hostId: string
  currentRound: number
  currentDrawerIndex: number
  drawOrder: string[]
  currentWord: string | null
  hintRevealed: number[]
  guessedPlayers: Map<string, { score: number; ratio: number }>
  roundStartTime: number
  drawActions: DrawAction[]
}

export interface PlayerState {
  id: string
  name: string
  color: number
  score: number
  isReady: boolean
  isConnected: boolean
  poopCount: number
  seatIndex: number
  lastDisconnect: number | null
}
