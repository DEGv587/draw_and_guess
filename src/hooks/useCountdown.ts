import { useState, useEffect, useRef } from 'react'

/**
 * 本地倒计时 hook
 * 服务端只在状态切换时发 timeLeft，客户端本地每秒递减
 * key 参数用于强制重启倒计时（即使 serverTimeLeft 值相同）
 */
export function useCountdown(serverTimeLeft: number, key?: number) {
  const [display, setDisplay] = useState(serverTimeLeft)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 服务端值或 key 变化时同步并重启
  useEffect(() => {
    setDisplay(serverTimeLeft)

    if (timerRef.current) clearInterval(timerRef.current)
    if (serverTimeLeft <= 0) return

    timerRef.current = setInterval(() => {
      setDisplay((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [serverTimeLeft, key])

  return display
}
