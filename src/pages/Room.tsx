import { useState, useRef, useCallback, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { PixelPlayerSeat } from '../components/ui/PixelSprite'
import { PixelFrame, PixelPanel, TileFloor } from '../components/ui/PixelScene'
import DrawingCanvas from '../components/Canvas/DrawingCanvas'
import type { DrawingCanvasHandle, DrawPoint } from '../components/Canvas/DrawingCanvas'
import CanvasToolbar from '../components/Canvas/CanvasToolbar'
import ChatPanel from '../components/Chat/ChatPanel'
import GameInfoBar from '../components/GameInfo/GameInfoBar'
import DrawerDisplay from '../components/GameInfo/DrawerDisplay'
import WordChooser from '../components/GameInfo/WordChooser'
import RoundTransition from '../components/GameInfo/RoundTransition'
import WaitingRoom from '../components/Room/WaitingRoom'
import { useWebSocket } from '../hooks/useWebSocket'
import { useCountdown } from '../hooks/useCountdown'
import { useGameStore } from '../stores/gameStore'
import { usePlayerStore } from '../stores/playerStore'
import { GAME_CONSTANTS } from '@shared/constants'
import type { RoomConfig } from '../components/Lobby/CreateRoomModal'
import type { ServerMessage, DrawAction } from '@shared/types'

const DEFAULT_CONFIG: RoomConfig = {
  seats: GAME_CONSTANTS.DEFAULT_SEATS,
  rounds: GAME_CONSTANTS.DEFAULT_ROUNDS,
  drawTime: GAME_CONSTANTS.DEFAULT_DRAW_TIME,
  wordMode: 'random',
  customWords: '',
}

/** 将服务端 DrawAction 转换为 DrawPoint 供画布重放 */
function drawActionToPoint(action: DrawAction, lastColor: string, lastSize: number): DrawPoint | null {
  switch (action.action) {
    case 'start':
      return { x: action.x, y: action.y, color: action.color, size: action.width, tool: 'pen', isStart: true }
    case 'move':
      return { x: action.x, y: action.y, color: lastColor, size: lastSize, tool: 'pen' }
    default:
      return null
  }
}

export default function Room() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const routeState = (location.state ?? {}) as { config?: RoomConfig; isHost?: boolean; playAgain?: boolean }
  const config = routeState.config ?? DEFAULT_CONFIG

  const { playerId, nickname, colorIndex } = usePlayerStore()
  const gameStore = useGameStore()
  const displayTime = useCountdown(gameStore.timeLeft)

  // 初始化 myPlayerId
  useEffect(() => {
    gameStore.setMyPlayerId(playerId)
    return () => gameStore.reset()
  }, [playerId]) // eslint-disable-line react-hooks/exhaustive-deps

  // WebSocket 消息处理
  const handleMessage = useCallback(
    (msg: ServerMessage) => gameStore.handleServerMessage(msg),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const { send, disconnect } = useWebSocket({
    roomId: roomId ?? '',
    playerId,
    playerName: nickname || `玩家${playerId.slice(0, 4)}`,
    colorIndex,
    onMessage: handleMessage,
    onConnect: () => {
      gameStore.setConnected(true)
      // 从结果页返回再来一局时，发送 play_again
      if (routeState.playAgain) {
        send({ type: 'play_again' })
        // 清除 state 避免重复发送
        navigate(location.pathname, { replace: true, state: {} })
      }
    },
    onDisconnect: () => gameStore.setConnected(false),
  })

  // 画布
  const canvasRef = useRef<DrawingCanvasHandle>(null)
  const [canvasColor, setCanvasColor] = useState('#1a1a1a')
  const [canvasBrushSize, setCanvasBrushSize] = useState(4)
  const [canvasTool, setCanvasTool] = useState<'pen' | 'eraser'>('pen')

  // 画手端：draw 消息批量发送（每 ~16ms 一批）
  const drawBatchRef = useRef<DrawAction[]>([])
  const drawFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flushDrawBatch = useCallback(() => {
    drawFlushTimerRef.current = null
    const batch = drawBatchRef.current
    if (batch.length === 0) return
    drawBatchRef.current = []
    if (batch.length === 1) {
      send({ type: 'draw', data: batch[0] })
    } else {
      send({ type: 'draw_batch', data: batch })
    }
  }, [send])

  const queueDrawAction = useCallback((action: DrawAction) => {
    drawBatchRef.current.push(action)
    // start/end/clear/undo 立即发送
    if (action.action !== 'move') {
      if (drawFlushTimerRef.current) {
        clearTimeout(drawFlushTimerRef.current)
      }
      flushDrawBatch()
    } else if (!drawFlushTimerRef.current) {
      drawFlushTimerRef.current = setTimeout(flushDrawBatch, 16)
    }
  }, [flushDrawBatch])

  // 进入新回合（drawing 阶段）时清空画布
  const prevStatusRef = useRef(gameStore.status)
  useEffect(() => {
    const prev = prevStatusRef.current
    prevStatusRef.current = gameStore.status
    if (gameStore.status === 'drawing' && prev !== 'drawing') {
      canvasRef.current?.clear()
      lastDrawPointRef.current = null
      prevPrevDrawPointRef.current = null
    }
  }, [gameStore.status])

  // 观众端：消费远程绘画数据并逐点重放到画布
  const lastDrawColorRef = useRef('#000000')
  const lastDrawSizeRef = useRef(4)
  const lastDrawPointRef = useRef<{ x: number; y: number } | null>(null)
  const prevPrevDrawPointRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (gameStore.isDrawer) return
    const actions = gameStore.consumeDrawActions()
    if (actions.length === 0) return

    const canvas = canvasRef.current
    if (!canvas) return

    for (const action of actions) {
      if (action.action === 'clear') {
        canvas.clear()
        lastDrawPointRef.current = null
        prevPrevDrawPointRef.current = null
        continue
      }
      if (action.action === 'undo') {
        canvas.undo()
        lastDrawPointRef.current = null
        prevPrevDrawPointRef.current = null
        continue
      }
      if (action.action === 'end') {
        // 笔画结束时，把最后一段用直线补完
        if (lastDrawPointRef.current && prevPrevDrawPointRef.current) {
          // 已经在 move 中用曲线画了，无需额外处理
        }
        lastDrawPointRef.current = null
        prevPrevDrawPointRef.current = null
        continue
      }
      if (action.action === 'start') {
        canvas.saveSnapshot()
        lastDrawColorRef.current = action.color
        lastDrawSizeRef.current = action.width
        canvas.drawRemoteDot(action.x, action.y, action.color, action.width)
        prevPrevDrawPointRef.current = null
        lastDrawPointRef.current = { x: action.x, y: action.y }
      } else if (action.action === 'move' && lastDrawPointRef.current) {
        const to = { x: action.x, y: action.y }
        if (prevPrevDrawPointRef.current) {
          // 有3个点，使用二次贝塞尔曲线插值
          canvas.drawRemoteCurve(
            prevPrevDrawPointRef.current,
            lastDrawPointRef.current,
            to,
            lastDrawColorRef.current,
            lastDrawSizeRef.current,
          )
        } else {
          // 只有2个点，用直线
          canvas.drawRemoteLine(
            lastDrawPointRef.current,
            to,
            lastDrawColorRef.current,
            lastDrawSizeRef.current,
          )
        }
        prevPrevDrawPointRef.current = lastDrawPointRef.current
        lastDrawPointRef.current = to
      }
    }
  }, [gameStore.drawActionVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLeave = () => {
    disconnect()
    navigate('/')
  }

  const handleSendMessage = (message: string) => {
    const myName = nickname || `玩家${playerId.slice(0, 4)}`
    if (gameStore.isDrawer) {
      send({ type: 'chat', message })
      gameStore.addChatMessage({ player: myName, message, type: 'chat' })
    } else {
      send({ type: 'guess', word: message })
      gameStore.addChatMessage({ player: myName, message, type: 'chat' })
    }
  }

  const drawerPlayer = gameStore.players.find(
    (p) => p.id === gameStore.currentDrawer || p.name === gameStore.currentDrawer,
  )
  const drawerName = drawerPlayer?.name ?? '?'

  // 移动端聊天折叠
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    if (gameStore.status === 'game_end' && gameStore.rankings) {
      navigate('/result', { state: { rankings: gameStore.rankings, roomId } })
    }
  }, [gameStore.status, gameStore.rankings, navigate, roomId])

  if (gameStore.status === 'waiting') {
    return (
      <WaitingRoom
        roomId={roomId ?? '???'}
        players={gameStore.players}
        settings={gameStore.settings}
        isHost={gameStore.isHost}
        myPlayerId={playerId}
        maxSeats={gameStore.settings?.maxPlayers ?? config.seats}
        send={send}
        onLeave={handleLeave}
      />
    )
  }

  // ===== 游戏阶段 =====
  return (
    <div className="h-screen flex flex-col bg-pixel-bg scanlines overflow-hidden">
      {/* 选词弹窗（画手在选词阶段可见） */}
      {gameStore.status === 'choosing' && gameStore.isDrawer && (
        gameStore.wordChoices ? (
          <WordChooser
            words={gameStore.wordChoices}
            timeLeft={displayTime}
            onChoose={(word) => {
              gameStore.setCurrentWord(word)
              send({ type: 'choose_word', word })
            }}
          />
        ) : (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="pixel-panel p-8 text-center">
              <p className="text-pixel-yellow pixel-text-shadow text-sm">准备选词...</p>
            </div>
          </div>
        )
      )}

      {/* 等待画手选词提示（非画手） */}
      {gameStore.status === 'choosing' && !gameStore.isDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="pixel-panel p-8 text-center">
            <p className="text-pixel-yellow pixel-text-shadow text-sm mb-2">
              {drawerName} 正在选词...
            </p>
            <div className="flex items-center justify-center gap-1">
              <div className="w-2 h-2 bg-pixel-yellow rounded-full animate-pulse-glow" />
              <span className="font-pixel text-lg text-pixel-yellow pixel-text-shadow">{displayTime}</span>
              <span className="text-pixel-tile/60 text-[10px]">s</span>
            </div>
          </div>
        </div>
      )}

      {/* 回合结束词语揭示 */}
      {gameStore.status === 'round_end' && (
        <RoundTransition
          status={gameStore.status}
          currentRound={gameStore.currentRound || 1}
          drawerName={drawerName}
          revealedWord={gameStore.hint}
          scoreDeltas={gameStore.scoreDeltas}
          playerNames={Object.fromEntries(gameStore.players.map((p) => [p.id, p.name]))}
        />
      )}

      {/* 回合开始动画（仅大轮第一个画手时显示轮次提示） */}
      {gameStore.status === 'drawing' && gameStore.isNewRound && (
        <RoundTransition
          status="choosing"
          currentRound={gameStore.currentRound || 1}
          drawerName={drawerName}
        />
      )}

      {/* 屎粑粑砸中效果 */}
      {gameStore.poopEffectActive && (
        <>
          {/* 全屏模糊 */}
          <div className="poop-blur-bg" />
          {/* 中心粑粑飞溅 */}
          <div className="poop-impact">
            <div className="poop-center">💩</div>
            <div className="poop-splat-particle poop-particle-1">💩</div>
            <div className="poop-splat-particle poop-particle-2">💩</div>
            <div className="poop-splat-particle poop-particle-3">💩</div>
            <div className="poop-splat-particle poop-particle-4">💩</div>
            <div className="poop-splat-particle poop-particle-5">💩</div>
          </div>
        </>
      )}

      {/* ===== 顶部信息栏 ===== */}
      <GameInfoBar
        roomId={roomId ?? '???'}
        wordHint={gameStore.hint ?? '_ _ _'}
        currentWord={gameStore.currentWord}
        isDrawer={gameStore.isDrawer}
        timeLeft={displayTime}
        currentRound={gameStore.currentRound || 1}
        totalRounds={gameStore.totalRounds}
        poopCount={gameStore.myPoopCount}
        onExit={handleLeave}
      />

      {/* ===== 主体区域 ===== */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0">

        {/* 左侧 - 画板区域 */}
        <div className="flex-1 flex flex-col brick-wall min-h-0">
          <div className="flex-1 flex items-center justify-center p-2 md:p-4 min-h-0">
            <PixelFrame variant="wood" className="w-full h-full max-w-[800px] min-h-0 overflow-hidden">
              <DrawingCanvas
                ref={canvasRef}
                isDrawer={gameStore.isDrawer}
                color={canvasColor}
                brushSize={canvasBrushSize}
                tool={canvasTool}
                onDraw={(point) => {
                  if (gameStore.isDrawer) {
                    queueDrawAction(
                      point.isStart
                        ? { action: 'start', x: point.x, y: point.y, color: point.color, width: point.size }
                        : { action: 'move', x: point.x, y: point.y },
                    )
                  }
                }}
                onStrokeEnd={() => {
                  if (gameStore.isDrawer) {
                    queueDrawAction({ action: 'end' })
                  }
                }}
              />
            </PixelFrame>
          </div>

          {/* 画笔工具栏（仅画手可见） */}
          {gameStore.isDrawer && gameStore.status === 'drawing' && (
            <PixelPanel className="mx-0 shrink-0">
              <CanvasToolbar
                color={canvasColor}
                brushSize={canvasBrushSize}
                tool={canvasTool}
                onColorChange={setCanvasColor}
                onBrushSizeChange={setCanvasBrushSize}
                onToolChange={setCanvasTool}
                onUndo={() => {
                  canvasRef.current?.undo()
                  queueDrawAction({ action: 'undo' })
                }}
                onClear={() => {
                  canvasRef.current?.clear()
                  queueDrawAction({ action: 'clear' })
                }}
              />
            </PixelPanel>
          )}
        </div>

        {/* 右侧/底部 - 画手 + 聊天（移动端可折叠） */}
        <div className={`
          md:w-80 flex flex-col border-t-4 md:border-t-0 md:border-l-4 border-pixel-border-dark
          ${chatOpen ? 'h-64' : 'h-10'} md:h-auto transition-[height] duration-200
        `}>
          {/* 移动端折叠按钮 */}
          <button
            className="md:hidden flex items-center justify-between px-3 py-1.5 bg-pixel-panel-dark shrink-0"
            onClick={() => setChatOpen(!chatOpen)}
          >
            <DrawerDisplay
              name={drawerName}
              colorIndex={drawerPlayer?.color ?? 0}
              compact
            />
            <span className="text-pixel-tile text-[10px]">{chatOpen ? '▼ 收起' : '▲ 聊天'}</span>
          </button>
          {/* 桌面端始终显示画手信息 */}
          <div className="hidden md:block">
            <DrawerDisplay
              name={drawerName}
              colorIndex={drawerPlayer?.color ?? 0}
            />
          </div>
          <ChatPanel
            messages={gameStore.chatMessages}
            isDrawer={gameStore.isDrawer}
            onSend={handleSendMessage}
            className={`${chatOpen ? 'flex' : 'hidden'} md:flex`}
          />
        </div>
      </div>

      {/* ===== 底部 - 玩家马桶区 ===== */}
      <TileFloor className="shrink-0 border-t-4 border-pixel-border-dark px-1 md:px-4 py-1 md:py-2">
        <div className="flex justify-center items-end gap-1 md:gap-3 flex-wrap">
          {gameStore.players
            .filter((p) => p.isConnected)
            .map((player) => {
              const isMe = player.id === playerId
              return (
                <PixelPlayerSeat
                  key={player.id}
                  name={player.name}
                  score={player.score}
                  colorIndex={player.color}
                  variant="back"
                  isHost={player.isHost}
                  scale={isMe ? 3 : 2.5}
                  className={`${
                    isMe
                      ? 'bg-pixel-yellow/15 ring-2 ring-pixel-yellow rounded-lg p-1 relative'
                      : 'opacity-75'
                  }`}
                  onClick={
                    isMe
                      ? undefined
                      : () => {
                          if (gameStore.myPoopCount > 0) {
                            send({ type: 'throw_poop', targetId: player.id })
                          }
                        }
                  }
                />
              )
            })}
        </div>
      </TileFloor>
    </div>
  )
}
