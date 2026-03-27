import { useState } from 'react'
import { PixelToilet, PixelPoop } from '../ui/PixelSprite'
import { PixelPanel } from '../ui/PixelScene'
import { GAME_CONSTANTS } from '@shared/constants'

export interface RoomConfig {
  seats: number
  rounds: number
  drawTime: number
  wordMode: 'random' | 'custom'
  customWords: string
}

const DEFAULT_CONFIG: RoomConfig = {
  seats: GAME_CONSTANTS.DEFAULT_SEATS,
  rounds: GAME_CONSTANTS.DEFAULT_ROUNDS,
  drawTime: GAME_CONSTANTS.DEFAULT_DRAW_TIME,
  wordMode: 'random',
  customWords: '',
}

export default function CreateRoomModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (config: RoomConfig) => void
}) {
  const [config, setConfig] = useState<RoomConfig>(DEFAULT_CONFIG)

  if (!open) return null

  const update = <K extends keyof RoomConfig>(key: K, value: RoomConfig[K]) =>
    setConfig((prev) => ({ ...prev, [key]: value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* 弹窗 */}
      <PixelPanel className="relative z-10 w-full max-w-md mx-4">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-pixel-yellow pixel-text-shadow text-sm">创建新厕所</h2>
          <button onClick={onClose} className="pixel-btn text-[10px] !py-1 !px-2">X</button>
        </div>

        {/* 马桶装饰 */}
        <div className="flex justify-center mb-4">
          <PixelToilet variant="front" scale={3} />
        </div>

        <div className="space-y-4">
          {/* 坑位数 */}
          <div>
            <label className="text-pixel-tile text-xs mb-2 block">
              坑位数 <span className="font-pixel text-pixel-yellow">{config.seats}</span>
            </label>
            <div className="flex gap-1 flex-wrap">
              {GAME_CONSTANTS.SEAT_COUNT_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => update('seats', n)}
                  className={`pixel-btn font-pixel text-[10px] !py-1.5 !px-3 ${
                    config.seats === n ? 'pixel-btn-primary' : ''
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* 轮数 */}
          <div>
            <label className="text-pixel-tile text-xs mb-2 block">
              轮数 <span className="font-pixel text-pixel-yellow">{config.rounds}</span>
            </label>
            <div className="flex gap-1">
              {Array.from({ length: GAME_CONSTANTS.MAX_ROUNDS }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => update('rounds', n)}
                  className={`pixel-btn font-pixel text-[10px] !py-1.5 !px-2.5 ${
                    config.rounds === n ? 'pixel-btn-primary' : ''
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* 回合时间 */}
          <div>
            <label className="text-pixel-tile text-xs mb-2 block">
              回合时间 <span className="font-pixel text-pixel-yellow">{config.drawTime}s</span>
            </label>
            <div className="flex gap-2">
              {GAME_CONSTANTS.DRAW_TIME_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => update('drawTime', t)}
                  className={`pixel-btn font-pixel text-[10px] !py-1.5 !px-3 ${
                    config.drawTime === t ? 'pixel-btn-primary' : ''
                  }`}
                >
                  {t}s
                </button>
              ))}
            </div>
          </div>

          {/* 词库模式 */}
          <div>
            <label className="text-pixel-tile text-xs mb-2 block">词库</label>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => update('wordMode', 'random')}
                className={`pixel-btn text-[10px] !py-1.5 !px-4 ${
                  config.wordMode === 'random' ? 'pixel-btn-primary' : ''
                }`}
              >
                随机词库
              </button>
              <button
                onClick={() => update('wordMode', 'custom')}
                className={`pixel-btn text-[10px] !py-1.5 !px-4 ${
                  config.wordMode === 'custom' ? 'pixel-btn-primary' : ''
                }`}
              >
                自定义
              </button>
            </div>
            {config.wordMode === 'custom' && (
              <textarea
                value={config.customWords}
                onChange={(e) => update('customWords', e.target.value)}
                placeholder="每行一个词语..."
                rows={4}
                className="pixel-input w-full text-xs resize-none"
              />
            )}
          </div>

          {/* 确认按钮 */}
          <div className="flex items-center gap-2 pt-2">
            <PixelPoop scale={2} />
            <button
              onClick={() => onCreate(config)}
              className="pixel-btn pixel-btn-primary flex-1 py-3 text-sm tracking-wider"
            >
              冲! 创建厕所
            </button>
            <PixelPoop scale={2} />
          </div>
        </div>
      </PixelPanel>
    </div>
  )
}
