import { useRef, useEffect, useCallback } from 'react'
import type { ClientMessage, ServerMessage } from '@shared/types'

interface UseWebSocketOptions {
  roomId: string
  playerId: string
  playerName: string
  colorIndex: number
  authToken?: string | null
  onMessage: (msg: ServerMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

const MAX_RETRIES = 5
const BASE_DELAY = 1000

export function useWebSocket({
  roomId,
  playerId,
  playerName,
  colorIndex,
  authToken,
  onMessage,
  onConnect,
  onDisconnect,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const retriesRef = useRef(0)
  const closedByUserRef = useRef(false)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 用 ref 保存所有参数和回调，避免依赖变化导致反复重连
  const paramsRef = useRef({ roomId, playerId, playerName, colorIndex, authToken })
  paramsRef.current = { roomId, playerId, playerName, colorIndex, authToken }

  const callbacksRef = useRef({ onMessage, onConnect, onDisconnect })
  callbacksRef.current = { onMessage, onConnect, onDisconnect }

  const connect = useCallback(() => {
    // 防止重复连接
    if (wsRef.current) {
      const state = wsRef.current.readyState
      if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) return
    }

    const { roomId: rid, playerId: pid, playerName: pname, colorIndex: cidx, authToken: token } = paramsRef.current
    const wsHost = import.meta.env.DEV ? 'localhost:8787' : location.host
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const params = new URLSearchParams({
      playerId: pid,
      name: pname,
      color: String(cidx),
      ...(token ? { token } : {}),
    })
    const url = `${protocol}//${wsHost}/ws/${rid}?${params}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      retriesRef.current = 0
      callbacksRef.current.onConnect?.()
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as ServerMessage
        callbacksRef.current.onMessage(msg)
      } catch {
        // 忽略非 JSON 消息
      }
    }

    ws.onclose = () => {
      // 只有当前活跃的 ws 才清理 ref
      if (wsRef.current === ws) {
        wsRef.current = null
      }
      callbacksRef.current.onDisconnect?.()

      if (closedByUserRef.current) return

      if (retriesRef.current < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, retriesRef.current)
        retriesRef.current++
        retryTimerRef.current = setTimeout(connect, delay)
      }
    }

    ws.onerror = () => {
      // onclose 会紧接着触发
    }
  }, []) // 无依赖，只创建一次

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  const disconnect = useCallback(() => {
    closedByUserRef.current = true
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
    wsRef.current?.close()
    wsRef.current = null
  }, [])

  useEffect(() => {
    closedByUserRef.current = false
    retriesRef.current = 0
    connect()
    return () => {
      closedByUserRef.current = true
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [connect])

  return { send, disconnect }
}
