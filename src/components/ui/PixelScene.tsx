/**
 * 像素风场景背景组件
 */

// ============================================================
// BrickWall — 砖墙背景
// ============================================================

export function BrickWall({
  children,
  className = '',
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={`brick-wall relative ${className}`}>
      {children}
    </div>
  )
}

// ============================================================
// TileFloor — 瓷砖地面
// ============================================================

export function TileFloor({
  children,
  className = '',
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={`tile-floor relative ${className}`}>
      {children}
    </div>
  )
}

// ============================================================
// ToiletScene — 完整厕所场景（砖墙 + 瓷砖地面分割）
// ============================================================

export function ToiletScene({
  children,
  wallRatio = 65,
  className = '',
}: {
  children?: React.ReactNode
  /** 墙壁占比 (%) */
  wallRatio?: number
  className?: string
}) {
  return (
    <div className={`min-h-screen relative overflow-hidden ${className}`}>
      {/* 砖墙上部 */}
      <div
        className="brick-wall absolute inset-0"
        style={{ height: `${wallRatio}%` }}
      />
      {/* 墙脚线 */}
      <div
        className="absolute left-0 right-0 h-3"
        style={{
          top: `${wallRatio}%`,
          backgroundColor: '#3a2f27',
          boxShadow: 'inset 0 1px 0 #5a4f47',
          zIndex: 1,
        }}
      />
      {/* 瓷砖地面下部 */}
      <div
        className="tile-floor absolute inset-0"
        style={{ top: `${wallRatio}%` }}
      />
      {/* 内容层 */}
      <div className="relative z-10 min-h-screen">
        {children}
      </div>
    </div>
  )
}

// ============================================================
// PixelFrame — 像素风装饰边框（用于画板等）
// ============================================================

export function PixelFrame({
  children,
  className = '',
  variant = 'wood',
}: {
  children?: React.ReactNode
  className?: string
  variant?: 'wood' | 'metal'
}) {
  const frameColor = variant === 'wood'
    ? { outer: '#5a4a2a', inner: '#8b7b5a', bg: '#c4a86a' }
    : { outer: '#4a4a5a', inner: '#7a7a8a', bg: '#a0a0b0' }

  return (
    <div
      className={`relative ${className}`}
      style={{
        border: `6px solid ${frameColor.outer}`,
        boxShadow: `
          inset 0 0 0 3px ${frameColor.inner},
          inset 0 0 0 5px ${frameColor.bg},
          4px 4px 0 0 rgba(0,0,0,0.3)
        `,
      }}
    >
      {/* 钉子装饰 */}
      <div className="absolute -top-1 left-4 w-2 h-2 rounded-full bg-gray-400 border border-gray-500" />
      <div className="absolute -top-1 right-4 w-2 h-2 rounded-full bg-gray-400 border border-gray-500" />
      {children}
    </div>
  )
}

// ============================================================
// PixelPanel — 像素风面板
// ============================================================

export function PixelPanel({
  children,
  className = '',
  inset = false,
}: {
  children?: React.ReactNode
  className?: string
  inset?: boolean
}) {
  return (
    <div className={`${inset ? 'pixel-panel-inset' : 'pixel-panel'} ${className}`}>
      {children}
    </div>
  )
}

// ============================================================
// ConfettiBackground — 纸屑飘落背景（用于结算页）
// ============================================================

const CONFETTI_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899', '#14b8a6', '#f97316']

export function ConfettiBackground({ count = 30 }: { count?: number }) {
  const confetti = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 3}s`,
    duration: `${2 + Math.random() * 3}s`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 4 + Math.floor(Math.random() * 4),
  }))

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {confetti.map((c) => (
        <div
          key={c.id}
          style={{
            position: 'absolute',
            left: c.left,
            top: '-10px',
            width: c.size,
            height: c.size,
            backgroundColor: c.color,
            animation: `confetti-fall ${c.duration} ${c.delay} linear infinite`,
          }}
        />
      ))}
    </div>
  )
}
