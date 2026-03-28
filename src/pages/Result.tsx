import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { PixelPlayerSeat, PixelCrown, PixelPoop } from '../components/ui/PixelSprite'
import { ToiletScene, ConfettiBackground, PixelPanel } from '../components/ui/PixelScene'
import type { PlayerScore } from '@shared/types'

const FALLBACK_RANKINGS: PlayerScore[] = []

/** 砸中时的溅射粒子 */
function PoopSplash({ active, pKey }: { active: boolean; pKey: number }) {
  if (!active) return null
  const particles = ['💩', '💩', '💥', '💩', '✨']
  return (
    <div key={pKey} className="absolute inset-0 pointer-events-none z-30">
      {particles.map((p, i) => (
        <span
          key={i}
          className={`absolute left-1/2 top-1/2 text-lg poop-splat-particle poop-particle-${i + 1}`}
        >
          {p}
        </span>
      ))}
    </div>
  )
}

/** 可被粑粑砸中的玩家容器 */
function PoopTarget({
  playerId,
  isHit,
  poopKey,
  poopScale,
  onThrow,
  onAnimEnd,
  children,
}: {
  playerId: string
  isHit: boolean
  poopKey: number
  poopScale: number
  onThrow: (id: string) => void
  onAnimEnd: () => void
  children: React.ReactNode
}) {
  return (
    <div className="relative cursor-pointer" onClick={() => onThrow(playerId)}>
      {isHit && (
        <div
          key={poopKey}
          className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-poop-throw"
          onAnimationEnd={onAnimEnd}
        >
          <PixelPoop scale={poopScale} />
        </div>
      )}
      <PoopSplash active={isHit} pKey={poopKey} />
      <div key={isHit ? poopKey : 'idle'} className={isHit ? 'animate-poop-hit-flash animate-poop-hit-shake' : ''}>
        {children}
      </div>
    </div>
  )
}

export default function Result() {
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = (location.state ?? {}) as { rankings?: PlayerScore[]; roomId?: string }
  const rankings = routeState.rankings ?? FALLBACK_RANKINGS
  const roomId = routeState.roomId

  // 粑粑投掷状态：key 递增强制重新触发动画
  const [poopTarget, setPoopTarget] = useState<{ id: string; key: number } | null>(null)

  const throwPoop = (targetId: string) => {
    setPoopTarget((prev) => ({ id: targetId, key: (prev?.key ?? 0) + 1 }))
  }

  const isHit = (id: string) => poopTarget?.id === id

  if (rankings.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pixel-bg scanlines">
        <div className="pixel-panel p-8 text-center">
          <p className="text-pixel-tile text-sm mb-4">没有游戏数据</p>
          <button onClick={() => navigate('/')} className="pixel-btn pixel-btn-primary text-sm">
            返回首页
          </button>
        </div>
      </div>
    )
  }

  const first = rankings[0]
  const second = rankings[1]
  const third = rankings[2]
  const rest = rankings.slice(3)

  return (
    <ToiletScene wallRatio={55} className="scanlines">
      <ConfettiBackground count={40} />

      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">

        {/* 标题 */}
        <h1 className="font-pixel text-xl md:text-2xl text-pixel-yellow pixel-text-glow mb-10 tracking-wider">
          GAME OVER
        </h1>

        {/* 领奖台 */}
        <div className="flex items-end gap-4 md:gap-8 mb-8">

          {/* 第二名 */}
          {second && (
            <div className="flex flex-col items-center">
              <PoopTarget
                playerId={second.player.id}
                isHit={isHit(second.player.id)}
                poopKey={poopTarget?.key ?? 0}
                poopScale={2}
                onThrow={throwPoop}
                onAnimEnd={() => setPoopTarget(null)}
              >
                <PixelPlayerSeat
                  name={second.player.name}
                  score={second.totalScore}
                  colorIndex={second.player.color}
                  variant="front"
                  shocked={isHit(second.player.id)}
                  scale={3}
                />
              </PoopTarget>
              <div
                className="w-24 h-16 mt-2 flex items-center justify-center"
                style={{
                  backgroundColor: '#a0a0b0',
                  boxShadow: 'inset -4px -4px 0 #7a7a8a, inset 4px 4px 0 #c0c0d0',
                }}
              >
                <span className="font-pixel text-2xl text-pixel-panel">2</span>
              </div>
            </div>
          )}

          {/* 第一名 */}
          <div className="flex flex-col items-center -mt-8">
            <div className="animate-float mb-1">
              <PixelCrown scale={4} />
            </div>
            <PoopTarget
                playerId={first.player.id}
                isHit={isHit(first.player.id)}
                poopKey={poopTarget?.key ?? 0}
                poopScale={3}
                onThrow={throwPoop}
                onAnimEnd={() => setPoopTarget(null)}
              >
                <PixelPlayerSeat
                  name={first.player.name}
                  score={first.totalScore}
                  colorIndex={first.player.color}
                  variant="front"
                  shocked={isHit(first.player.id)}
                  gold
                  scale={4}
                />
              </PoopTarget>
            <div
              className="w-28 h-24 mt-2 flex items-center justify-center"
              style={{
                backgroundColor: '#fbbf24',
                boxShadow: 'inset -4px -4px 0 #d97706, inset 4px 4px 0 #fde68a',
              }}
            >
              <span className="font-pixel text-3xl text-pixel-brown">1</span>
            </div>
          </div>

          {/* 第三名 */}
          {third && (
            <div className="flex flex-col items-center">
              <PoopTarget
                playerId={third.player.id}
                isHit={isHit(third.player.id)}
                poopKey={poopTarget?.key ?? 0}
                poopScale={2}
                onThrow={throwPoop}
                onAnimEnd={() => setPoopTarget(null)}
              >
                <PixelPlayerSeat
                  name={third.player.name}
                  score={third.totalScore}
                  colorIndex={third.player.color}
                  variant="front"
                  shocked={isHit(third.player.id)}
                  scale={3}
                />
              </PoopTarget>
              <div
                className="w-24 h-12 mt-2 flex items-center justify-center"
                style={{
                  backgroundColor: '#cd7f32',
                  boxShadow: 'inset -4px -4px 0 #a0622a, inset 4px 4px 0 #daa060',
                }}
              >
                <span className="font-pixel text-2xl text-pixel-panel">3</span>
              </div>
            </div>
          )}
        </div>

        {/* 其余排名 */}
        {rest.length > 0 && (
          <PixelPanel className="flex gap-6 mb-8 !py-3">
            {rest.map((r) => (
              <div
                key={r.player.id}
                className="flex items-center gap-2 cursor-pointer hover:scale-110 transition-transform relative"
                onClick={() => throwPoop(r.player.id)}
              >
                {isHit(r.player.id) && (
                  <div
                    key={poopTarget!.key}
                    className="absolute left-1/2 -translate-x-1/2 -top-6 z-20 pointer-events-none animate-poop-throw"
                    onAnimationEnd={() => setPoopTarget(null)}
                  >
                    <PixelPoop scale={1.5} />
                  </div>
                )}
                <span key={`rank-${isHit(r.player.id) ? poopTarget!.key : 'idle'}`} className={`font-pixel text-xs text-pixel-tile/60 ${isHit(r.player.id) ? 'animate-poop-hit-flash animate-poop-hit-shake' : ''}`}>{r.rank}.</span>
                <span key={`name-${isHit(r.player.id) ? poopTarget!.key : 'idle'}`} className={`text-xs text-pixel-tile ${isHit(r.player.id) ? 'animate-poop-hit-flash animate-poop-hit-shake' : ''}`}>{r.player.name}</span>
                <span className="font-pixel text-[10px] text-pixel-yellow">{r.totalScore}</span>
              </div>
            ))}
          </PixelPanel>
        )}

        {/* 装饰屎粑粑 */}
        <div className="flex items-center gap-3 mb-6">
          <PixelPoop scale={2} />
          <PixelPoop scale={3} className="animate-float" />
          <PixelPoop scale={2} />
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-4">
          <button
            onClick={() => {
              if (roomId) {
                navigate(`/room/${roomId}`, { state: { playAgain: true } })
              } else {
                navigate('/')
              }
            }}
            className="pixel-btn pixel-btn-primary py-3 px-8 text-sm tracking-wider"
          >
            再来一局
          </button>
          <button
            onClick={() => navigate('/')}
            className="pixel-btn py-3 px-8 text-sm tracking-wider"
          >
            离开厕所
          </button>
        </div>
      </div>
    </ToiletScene>
  )
}
