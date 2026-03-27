import { create } from 'zustand'
import type { ServerMessage, Player, RoomSettings, RoomState, PlayerScore, DrawAction } from '@shared/types'
import { GAME_CONSTANTS } from '@shared/constants'
import type { ChatMessage } from '../components/Chat/ChatPanel'

interface GameState {
  // 连接
  connected: boolean

  // 房间
  roomId: string | null
  status: RoomState['status']
  players: Player[]
  settings: RoomSettings | null

  // 游戏进度
  currentRound: number
  totalRounds: number
  currentDrawer: string | null
  hint: string | null
  timeLeft: number

  // 选词
  wordChoices: string[] | null
  /** 画手选中的完整词（仅画手本人可见） */
  currentWord: string | null

  // 聊天
  chatMessages: ChatMessage[]

  // 我的状态
  myPlayerId: string | null

  // 屎粑粑效果
  poopEffectActive: boolean

  // 排名（游戏结束）
  rankings: PlayerScore[] | null

  // 是否是大轮的第一个画手（用于显示轮次提示）
  isNewRound: boolean

  // 回合得分变化（用于过渡动画）
  scoreDeltas: Record<string, number>

  // 画布数据（用于观众接收远程绘画）
  pendingDrawActions: DrawAction[]
  drawActionVersion: number

  // 计算属性
  isHost: boolean
  isDrawer: boolean
  myPoopCount: number

  // Actions
  setMyPlayerId: (id: string) => void
  setConnected: (v: boolean) => void
  setCurrentWord: (word: string) => void
  handleServerMessage: (msg: ServerMessage) => void
  addChatMessage: (msg: ChatMessage) => void
  consumeDrawActions: () => DrawAction[]
  reset: () => void
}

const INITIAL_SETTINGS: RoomSettings = {
  maxPlayers: GAME_CONSTANTS.DEFAULT_SEATS,
  rounds: GAME_CONSTANTS.DEFAULT_ROUNDS,
  drawTime: GAME_CONSTANTS.DEFAULT_DRAW_TIME,
  wordDifficulty: 'medium',
  customWords: [],
}

const INITIAL_STATE = {
  connected: false,
  roomId: null,
  status: 'waiting' as const,
  players: [],
  settings: null,
  currentRound: 0,
  totalRounds: 3,
  currentDrawer: null,
  hint: null,
  timeLeft: 0,
  wordChoices: null,
  currentWord: null,
  chatMessages: [],
  myPlayerId: null,
  poopEffectActive: false,
  rankings: null,
  isNewRound: false,
  scoreDeltas: {},
  pendingDrawActions: [],
  drawActionVersion: 0,
  isHost: false,
  isDrawer: false,
  myPoopCount: 0,
}

export const useGameStore = create<GameState>((set, get) => ({
  ...INITIAL_STATE,

  setMyPlayerId: (id) => set({ myPlayerId: id }),
  setConnected: (v) => set({ connected: v }),
  setCurrentWord: (word) => set({ currentWord: word }),

  handleServerMessage: (msg: ServerMessage) => {
    const state = get()

    switch (msg.type) {
      case 'room_state': {
        const data = msg.data
        const me = data.players.find((p) => p.id === state.myPlayerId)
        set({
          roomId: data.roomId,
          status: data.status,
          players: data.players,
          settings: data.settings,
          currentRound: data.currentRound,
          totalRounds: data.totalRounds,
          currentDrawer: data.currentDrawer,
          hint: data.hint,
          timeLeft: data.timeLeft,
          isHost: me?.isHost ?? false,
          isDrawer: data.currentDrawer === state.myPlayerId,
          myPoopCount: me?.poopCount ?? 0,
        })
        break
      }

      case 'player_joined': {
        set((s) => {
          const exists = s.players.some((p) => p.id === msg.player.id)
          const players = exists
            ? s.players.map((p) => (p.id === msg.player.id ? msg.player : p))
            : [...s.players, msg.player]
          return {
            players,
            chatMessages: [
              ...s.chatMessages,
              { player: msg.player.name, message: '加入了房间', type: 'chat' as const },
            ],
          }
        })
        break
      }

      case 'player_left': {
        set((s) => ({
          players: s.players.map((p) =>
            p.id === msg.player.id ? { ...p, isConnected: false } : p,
          ),
          chatMessages: [
            ...s.chatMessages,
            { player: msg.player.name, message: '离开了房间', type: 'chat' as const },
          ],
        }))
        break
      }

      case 'host_changed': {
        set((s) => ({
          players: s.players.map((p) => ({ ...p, isHost: p.name === msg.newHost })),
          isHost: s.players.find((p) => p.id === s.myPlayerId)?.name === msg.newHost,
        }))
        break
      }

      case 'round_start': {
        set((s) => {
          const amDrawer = s.players.find((p) => p.name === msg.drawer)?.id === s.myPlayerId
          return {
            status: msg.phase,
            currentRound: msg.round,
            currentDrawer: msg.drawer,
            hint: msg.hint,
            timeLeft: msg.duration,
            isDrawer: amDrawer,
            isNewRound: msg.isNewRound,
            wordChoices: null,
            // drawing 阶段且我是画手时保留已选的词，否则清空
            currentWord: (msg.phase === 'drawing' && amDrawer) ? s.currentWord : null,
            pendingDrawActions: [],
            drawActionVersion: 0,
            scoreDeltas: {},
          }
        })
        break
      }

      case 'choose_words': {
        set({
          status: 'choosing',
          wordChoices: msg.words,
        })
        break
      }

      case 'hint_update': {
        set({ hint: msg.hint })
        break
      }

      case 'draw': {
        // push into existing array, then bump version to trigger re-render
        get().pendingDrawActions.push(msg.data)
        set((s) => ({ drawActionVersion: s.drawActionVersion + 1 }))
        break
      }

      case 'draw_batch': {
        const pending = get().pendingDrawActions
        for (const action of msg.data) {
          pending.push(action)
        }
        set((s) => ({ drawActionVersion: s.drawActionVersion + 1 }))
        break
      }

      case 'guess_result': {
        if (msg.correct) {
          const guesser = state.players.find((p) => p.name === msg.player)
          // 第一个猜对的人奖励粑粑（此时聊天里还没有其他 correct 消息）
          const isFirstCorrect = !state.chatMessages.some((m) => m.type === 'correct')
          const isMe = guesser?.id === state.myPlayerId
          set((s) => ({
            chatMessages: [
              ...s.chatMessages,
              { player: msg.player, message: '', type: 'correct' as const },
            ],
            myPoopCount: isMe && isFirstCorrect ? s.myPoopCount + 1 : s.myPoopCount,
          }))
        }
        break
      }

      case 'chat': {
        set((s) => ({
          chatMessages: [
            ...s.chatMessages,
            { player: msg.player, message: msg.message, type: 'chat' as const },
          ],
        }))
        break
      }

      case 'round_end': {
        set((s) => ({
          status: 'round_end',
          hint: msg.word,
          wordChoices: null,
          scoreDeltas: msg.scores,
          players: s.players.map((p) => ({
            ...p,
            score: p.score + (msg.scores[p.id] ?? 0),
          })),
        }))
        break
      }

      case 'game_end': {
        set({
          status: 'game_end',
          rankings: msg.rankings,
        })
        break
      }

      case 'poop_hit': {
        if (state.players.find((p) => p.name === msg.targetPlayer)?.id === state.myPlayerId) {
          set({ poopEffectActive: true })
          setTimeout(() => set({ poopEffectActive: false }), GAME_CONSTANTS.POOP_EFFECT_DURATION * 1000)
        }
        set((s) => ({
          chatMessages: [
            ...s.chatMessages,
            { player: msg.fromPlayer, message: `向 ${msg.targetPlayer} 扔了屎粑粑!`, type: 'chat' as const },
          ],
        }))
        break
      }

      case 'error': {
        console.error('[GameRoom]', msg.message)
        break
      }
    }
  },

  addChatMessage: (msg) =>
    set((s) => ({ chatMessages: [...s.chatMessages, msg] })),

  consumeDrawActions: () => {
    const actions = get().pendingDrawActions
    if (actions.length === 0) return actions
    set({ pendingDrawActions: [] })
    return actions
  },

  reset: () => set(INITIAL_STATE),
}))
