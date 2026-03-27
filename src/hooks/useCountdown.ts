import { useState, useEffect, useRef } from 'react'

/**
 * 本地倒计时 hook
 * 服务端只在状态切换时发 timeLeft，客户端本地每秒递减
 */
export function useCountdown(serverTimeLeft: number) {
  const [display, setDisplay] = useState(serverTimeLeft)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 服务端值变化时同步
  useEffect(() => {
    setDisplay(serverTimeLeft)
  }, [serverTimeLeft])

  // 本地每秒递减
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)

    if (display <= 0) return

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
  }, [serverTimeLeft]) // 仅在服务端值变化时重启计时器 eslint-disable-line

  return display
}
