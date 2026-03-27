import { useState } from 'react'
import { PixelToilet, PixelCharacter } from '../ui/PixelSprite'
import { ToiletScene, PixelPanel } from '../ui/PixelScene'
import { GAME_CONSTANTS } from '@shared/constants'
import type { Player, RoomSettings } from '@shared/types'
import type { ClientMessage } from '@shared/types'

interface WaitingRoomProps {
  roomId: string
  players: Player[]
  settings: RoomSettings | null
  isHost: boolean
  myPlayerId: string
  maxSeats: number
  send: (msg: ClientMessage) => void
  onLeave: () => void
}

export default function WaitingRoom({
  roomId,
  players,
  settings,
  isHost,
  myPlayerId,
  maxSeats,
  send,
  onLeave,
}: WaitingRoomProps) {
  const [sittingAnim, setSittingAnim] = useState<string | null>(null)

  const handleReady = () => {
    send({ type: 'ready' })
    setSittingAnim(myPlayerId)
    setTimeout(() => setSittingAnim(null), 500)
  }

  const handleStart = () => {
    send({ type: 'start_game' })
  }

  const myPlayer = players.find((p) => p.id === myPlayerId)
  const connectedPlayers = players.filter((p) => p.isConnected)
  const readyCount = connectedPlayers.filter((p) => p.isReady).length
  const canStart = isHost && readyCount >= GAME_CONSTANTS.MIN_PLAYERS

  // 生成坑位列表：按 seatIndex 排列，已有玩家 + 空位
  const playerBySeat = new Map(
    connectedPlayers.map((p) => [p.seatIndex, p]),
  )
  const seats = Array.from({ length: maxSeats }, (_, i) => ({
    index: i,
    player: playerBySeat.get(i) ?? null,
  }))

  return (
    <ToiletScene wallRatio={50} className="scanlines">
      <div className="min-h-screen flex flex-col items-center p-4 md:p-8">

        {/* 顶部信息 */}
        <PixelPanel className="w-full max-w-2xl mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-pixel-tile/60 text-xs">房间</span>
            <span className="font-pixel text-sm text-pixel-yellow pixel-text-shadow">#{roomId}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-pixel-tile text-xs">
              <span className="font-pixel text-pixel-green">{connectedPlayers.length}</span>
              /{maxSeats} 人
            </span>
            <button onClick={onLeave} className="pixel-btn text-[10px] !py-1 !px-3">
              离开
            </button>
          </div>
        </PixelPanel>

        {/* 标题 */}
        <h2 className="text-pixel-yellow pixel-text-shadow text-sm mb-2">等待玩家就绪</h2>
        <p className="text-pixel-tile/50 text-[10px] mb-6">点击"准备就座"开始游戏</p>

        {/* 坑位区域 */}
        <div className="flex gap-3 md:gap-5 flex-wrap justify-center mb-8 max-w-3xl">
          {seats.map((seat) => {
            const p = seat.player
            const isMe = p?.id === myPlayerId
            const isEmpty = !p
            const isSitting = sittingAnim === p?.id

            return (
              <div
                key={seat.index}
                onClick={isEmpty ? () => send({ type: 'select_seat', seatIndex: seat.index }) : undefined}
                className={`
                  flex flex-col items-center p-2 rounded
                  transition-all duration-200
                  ${isEmpty ? 'opacity-40 cursor-pointer hover:opacity-70' : ''}
                  ${isMe ? 'ring-2 ring-pixel-yellow' : ''}
                  ${isSitting ? 'animate-sit-down' : ''}
                `}
              >
                {/* 准备状态 */}
                <div className="flex items-center gap-[2px] mb-1 h-6">
                  {p ? (
                    <span className={`text-[8px] font-pixel ${p.isReady ? 'text-pixel-green' : 'text-pixel-tile/30'}`}>
                      {p.isReady ? '已准备' : '未准备'}
                    </span>
                  ) : (
                    <span className="text-pixel-tile/30 text-[8px]">?</span>
                  )}
                </div>

                {/* 角色 */}
                {p ? (
                  <div className={`mb-[-6px] relative z-10 ${isSitting ? 'animate-sit-down' : ''}`}>
                    <PixelCharacter
                      variant="front"
                      colorIndex={p.color}
                      scale={isMe ? 4 : 3}
                    />
                  </div>
                ) : (
                  <div className="mb-[-6px] h-[30px]" />
                )}

                {/* 马桶 */}
                <PixelToilet variant="front" scale={3} />

                {/* 名字 */}
                {p ? (
                  <span className={`text-xs mt-1 pixel-text-shadow ${isMe ? 'text-pixel-yellow' : 'text-white'}`}>
                    {p.name}
                    {p.isHost && <span className="text-pixel-red ml-0.5">*</span>}
                  </span>
                ) : (
                  <span className="text-[10px] mt-1 text-pixel-green/60">
                    坑位 {seat.index + 1}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* 房间设置预览 */}
        {settings && (
          <PixelPanel className="w-full max-w-md mb-6">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-pixel-tile/60">坑位数</div>
              <div className="font-pixel text-pixel-yellow text-[10px]">{settings.maxPlayers}</div>
              <div className="text-pixel-tile/60">轮数</div>
              <div className="font-pixel text-pixel-yellow text-[10px]">{settings.rounds}</div>
              <div className="text-pixel-tile/60">回合时间</div>
              <div className="font-pixel text-pixel-yellow text-[10px]">{settings.drawTime}s</div>
            </div>
          </PixelPanel>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-4">
          {!myPlayer?.isReady && (
            <button
              onClick={handleReady}
              className="pixel-btn pixel-btn-primary py-3 px-10 text-sm tracking-wider"
            >
              准备就座
            </button>
          )}
          {myPlayer?.isReady && !isHost && (
            <div className="pixel-panel-inset !py-3 !px-8 text-pixel-tile/60 text-xs">
              等待房主开始...
            </div>
          )}
          {isHost && (
            <button
              onClick={handleStart}
              disabled={!canStart}
              className={`pixel-btn pixel-btn-primary py-3 px-10 text-sm tracking-wider ${
                !canStart ? 'opacity-40 cursor-not-allowed' : 'animate-pulse-glow'
              }`}
            >
              {canStart
                ? '开始游戏!'
                : `等待准备 (${readyCount}/${GAME_CONSTANTS.MIN_PLAYERS})`}
            </button>
          )}
        </div>
      </div>
    </ToiletScene>
  )
}
