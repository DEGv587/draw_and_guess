import { create } from 'zustand'
import { getOrCreatePlayerId } from '../utils/playerId'

interface AuthUser {
  id: string
  username: string
  nickname: string
}

interface PlayerStore {
  playerId: string
  nickname: string
  colorIndex: number
  // 登录态
  authToken: string | null
  authUser: AuthUser | null
  setNickname: (name: string) => void
  setColorIndex: (idx: number) => void
  setAuth: (token: string, user: AuthUser) => void
  clearAuth: () => void
}

export const usePlayerStore = create<PlayerStore>((set) => {
  const stored = localStorage.getItem('draw_wc_player')
  const saved = stored ? (JSON.parse(stored) as { nickname?: string; colorIndex?: number; authToken?: string; authUser?: AuthUser }) : {}

  return {
    playerId: getOrCreatePlayerId(),
    nickname: saved.authUser?.nickname ?? saved.nickname ?? '',
    colorIndex: saved.colorIndex ?? 0,
    authToken: saved.authToken ?? null,
    authUser: saved.authUser ?? null,

    setNickname: (name: string) =>
      set((s) => {
        const next = { ...s, nickname: name }
        persistStore(next)
        return next
      }),

    setColorIndex: (idx: number) =>
      set((s) => {
        const next = { ...s, colorIndex: idx }
        persistStore(next)
        return next
      }),

    setAuth: (token: string, user: AuthUser) =>
      set((s) => {
        const next = { ...s, authToken: token, authUser: user, nickname: user.nickname }
        persistStore(next)
        return next
      }),

    clearAuth: () =>
      set((s) => {
        const next = { ...s, authToken: null, authUser: null }
        persistStore(next)
        return next
      }),
  }
})

function persistStore(s: { nickname: string; colorIndex: number; authToken: string | null; authUser: AuthUser | null }) {
  localStorage.setItem('draw_wc_player', JSON.stringify({
    nickname: s.nickname,
    colorIndex: s.colorIndex,
    authToken: s.authToken,
    authUser: s.authUser,
  }))
}
