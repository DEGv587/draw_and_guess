import { useEffect, useState } from 'react'
import type { RoomState } from '@shared/types'

const TRANSITION_CONFIG = {
  choosing: { phase: 'round' as const, duration: 2000 },
  round_end: { phase: 'reveal' as const, duration: 4000 },
} as const

interface RoundTransitionProps {
  status: RoomState['status']
  currentRound: number
  drawerName: string
  revealedWord?: string | null
  scoreDeltas?: Record<string, number>
  playerNames?: Record<string, string>
}

export default function RoundTransition({
  status,
  currentRound,
  drawerName,
  revealedWord,
  scoreDeltas,
  playerNames,
}: RoundTransitionProps) {
  const [show, setShow] = useState(false)
  const [phase, setPhase] = useState<'round' | 'reveal' | null>(null)

  useEffect(() => {
    const config = TRANSITION_CONFIG[status as keyof typeof TRANSITION_CONFIG]
    if (!config) return

    setPhase(config.phase)
    setShow(true)
    const timer = setTimeout(() => setShow(false), config.duration)
    return () => clearTimeout(timer)
  }, [status, currentRound])

  if (!show || !phase) return null

  if (phase === 'round') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="animate-round-splash text-center">
          <p className="font-pixel text-3xl text-pixel-yellow pixel-text-glow tracking-widest mb-3">
            第 {currentRound} 轮
          </p>
          <p className="text-pixel-tile text-sm">
            {drawerName} 来画
          </p>
        </div>
      </div>
    )
  }

  const deltas = scoreDeltas ?? {}
  const names = playerNames ?? {}
  const entries = Object.entries(deltas).filter(([, v]) => v > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 pointer-events-none">
      <div className="pixel-panel p-8 text-center pointer-events-auto animate-round-splash">
        <p className="text-pixel-tile/60 text-xs mb-2">答案是</p>
        <p className="font-pixel text-xl text-pixel-yellow pixel-text-glow tracking-widest mb-4">
          {revealedWord ?? '???'}
        </p>

        {entries.length > 0 && (
          <div className="flex flex-col gap-1 mt-2">
            {entries.map(([pid, score]) => (
              <div key={pid} className="flex items-center justify-center gap-2 animate-score-pop">
                <span className="text-pixel-tile text-xs">{names[pid] ?? pid}</span>
                <span className="font-pixel text-sm text-pixel-green pixel-text-shadow">+{score}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
