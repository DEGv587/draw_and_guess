import { PixelPoop } from '../ui/PixelSprite'
import { PixelPanel } from '../ui/PixelScene'

interface GameInfoBarProps {
  roomId: string
  /** 当前词语提示（如 "_ 猫 _"） */
  wordHint: string
  /** 画手选中的完整词（仅画手可见） */
  currentWord?: string | null
  /** 是否是画手 */
  isDrawer?: boolean
  /** 剩余秒数 */
  timeLeft: number
  /** 当前轮次 */
  currentRound: number
  /** 总轮数 */
  totalRounds: number
  /** 屎粑粑数量 */
  poopCount: number
  onExit: () => void
}

export default function GameInfoBar({
  roomId,
  wordHint,
  currentWord,
  isDrawer,
  timeLeft,
  currentRound,
  totalRounds,
  poopCount,
  onExit,
}: GameInfoBarProps) {
  const isUrgent = timeLeft <= 10
  const displayWord = isDrawer && currentWord ? currentWord : wordHint

  return (
    <PixelPanel className="flex items-center justify-between px-2 md:px-4 py-1.5 md:py-2 !p-0">
      <div className="flex items-center gap-1.5 md:gap-4 px-2 md:px-4 py-1.5 md:py-2 min-w-0 overflow-hidden">
        <span className="text-pixel-tile/60 text-[10px] md:text-xs hidden md:inline shrink-0">#{roomId}</span>
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-pixel-tile text-[10px] md:text-xs hidden md:inline shrink-0">
            {isDrawer ? '当前词:' : '提示:'}
          </span>
          <span className={`font-pixel text-[10px] md:text-sm pixel-text-shadow truncate ${
            isDrawer && currentWord ? 'text-pixel-green tracking-[0.15em] md:tracking-[0.2em]' : 'text-pixel-yellow tracking-[0.15em] md:tracking-[0.3em]'
          }`}>
            {displayWord}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 md:gap-4 px-2 md:px-4 py-1.5 md:py-2 shrink-0">
        {/* 倒计时 */}
        <div className="flex items-center gap-0.5 md:gap-1">
          <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full animate-pulse-glow ${isUrgent ? 'bg-pixel-red' : 'bg-pixel-green'}`} />
          <span className={`font-pixel text-xs md:text-lg pixel-text-shadow ${isUrgent ? 'text-pixel-red' : 'text-pixel-green'}`}>
            {timeLeft}
          </span>
          <span className="text-pixel-tile/60 text-[8px] hidden md:inline">s</span>
        </div>

        {/* 轮次 */}
        <span className="text-pixel-tile text-[10px] md:text-xs">
          <span className="hidden md:inline">轮次 </span><span className="font-pixel text-pixel-yellow">{currentRound}</span>/{totalRounds}
        </span>

        {/* 屎粑粑 */}
        <div className="flex items-center gap-0.5 cursor-pointer hover:scale-110 transition-transform">
          <PixelPoop scale={1.5} />
          <span className="font-pixel text-[10px] text-pixel-yellow">x{poopCount}</span>
        </div>

        {/* 退出 */}
        <button onClick={onExit} className="pixel-btn text-[10px] !py-1 !px-2">
          退出
        </button>
      </div>
    </PixelPanel>
  )
}
