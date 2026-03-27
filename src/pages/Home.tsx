import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PixelDoor, PixelPipe, PixelPoop } from '../components/ui/PixelSprite'
import { ToiletScene, PixelPanel } from '../components/ui/PixelScene'
import CreateRoomModal, { type RoomConfig } from '../components/Lobby/CreateRoomModal'
import { usePlayerStore } from '../stores/playerStore'
import { api } from '../utils/api'

interface RoomSummary {
  roomId: string
  status: 'waiting' | 'playing' | 'full'
  playerCount: number
  maxPlayers: number
}

const STATUS_LABELS: Record<string, string> = {
  waiting: '空闲',
  playing: '游戏中',
  full: '已满',
}

const STATUS_COLORS: Record<string, string> = {
  waiting: 'text-pixel-green',
  playing: 'text-pixel-yellow',
  full: 'text-pixel-red',
}

function mapDoorStatus(room: RoomSummary): 'empty' | 'playing' | 'full' {
  if (room.status === 'waiting') return 'empty'
  if (room.playerCount >= room.maxPlayers) return 'full'
  return room.status === 'playing' ? 'playing' : 'empty'
}

export default function Home() {
  const navigate = useNavigate()
  const { nickname, setNickname, playerId, colorIndex, authUser, authToken, setAuth, clearAuth } = usePlayerStore()
  const [roomCode, setRoomCode] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [rooms, setRooms] = useState<RoomSummary[]>([])

  // 登录/注册状态
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authUsername, setAuthUsername] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authNickname, setAuthNickname] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // 拉取房间列表
  useEffect(() => {
    api.get<{ rooms: RoomSummary[] }>('/rooms').then((res) => setRooms(res.rooms)).catch(() => {})
    const timer = setInterval(() => {
      api.get<{ rooms: RoomSummary[] }>('/rooms').then((res) => setRooms(res.rooms)).catch(() => {})
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const handleCreateRoom = async (config: RoomConfig) => {
    if (!nickname.trim()) return

    try {
      const res = await api.post<{ roomId: string }>('/rooms', {
        settings: {
          maxPlayers: config.seats,
          rounds: config.rounds,
          drawTime: config.drawTime,
          customWords: config.wordMode === 'custom' ? config.customWords.split('\n').filter(Boolean) : [],
        },
        hostId: playerId,
        hostName: nickname,
        hostColor: colorIndex,
      })
      navigate(`/room/${res.roomId}`, { state: { config, isHost: true } })
    } catch (err) {
      console.error('创建房间失败:', err)
    }
  }

  const handleJoinRoom = async () => {
    const code = roomCode.trim().toUpperCase()
    if (!code || !nickname.trim()) return

    try {
      await api.get(`/rooms/${code}`)
      navigate(`/room/${code}`, { state: { isHost: false } })
    } catch {
      alert('房间不存在')
    }
  }

  const handleDoorClick = (room: RoomSummary) => {
    if (!nickname.trim()) return
    const doorStatus = mapDoorStatus(room)
    if (doorStatus === 'full') return
    navigate(`/room/${room.roomId}`, { state: { isHost: false } })
  }

  const handleAuth = async () => {
    setAuthError('')
    setAuthLoading(true)
    try {
      if (authMode === 'register') {
        const res = await api.post<{ token: string; user: { id: string; username: string; nickname: string } }>('/auth/register', {
          username: authUsername,
          password: authPassword,
          nickname: authNickname || authUsername,
        })
        setAuth(res.token, res.user)
      } else {
        const res = await api.post<{ token: string; user: { id: string; username: string; nickname: string } }>('/auth/login', {
          username: authUsername,
          password: authPassword,
        })
        setAuth(res.token, res.user)
      }
      setShowAuth(false)
      setAuthUsername('')
      setAuthPassword('')
      setAuthNickname('')
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : '操作失败')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    if (authToken) {
      api.post('/auth/logout', {}, { Authorization: `Bearer ${authToken}` }).catch(() => {})
    }
    clearAuth()
  }

  return (
    <ToiletScene wallRatio={62} className="scanlines">
      <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">

        {/* 顶部水管装饰 */}
        <div className="flex items-center gap-0 mb-6">
          <PixelPipe length={60} direction="horizontal" />
          <div className="w-3 h-3 bg-pixel-pipe-dark rounded-full" />
          <PixelPipe length={40} direction="vertical" className="ml-[-6px]" />
        </div>

        {/* 标题 */}
        <div className="text-center mb-2">
          <h1 className="font-pixel text-2xl md:text-3xl text-pixel-yellow pixel-text-glow tracking-wider mb-3">
            DRAW WC
          </h1>
          <p className="text-pixel-tile text-sm tracking-widest mb-1">
            —— 画画厕所 ——
          </p>
          <p className="text-pixel-tile/60 text-xs">
            你画我猜
          </p>
        </div>

        {/* 屎粑粑装饰 */}
        <div className="flex items-center gap-2 mb-8">
          <PixelPoop scale={2} />
          <div className="w-16 h-[2px] bg-pixel-border" />
          <PixelPoop scale={2} />
        </div>

        {/* 厕所门场景 */}
        <div className="flex gap-3 md:gap-5 mb-8 flex-wrap justify-center">
          {rooms.length === 0 ? (
            <p className="text-pixel-tile/40 text-xs">暂无房间，创建一个吧</p>
          ) : (
            rooms.map((room) => {
              const doorStatus = mapDoorStatus(room)
              return (
                <button
                  key={room.roomId}
                  onClick={() => handleDoorClick(room)}
                  disabled={doorStatus === 'full'}
                  className={`
                    flex flex-col items-center gap-2 p-2
                    transition-all duration-100
                    ${doorStatus === 'full' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1 active:translate-y-0'}
                  `}
                >
                  <div className={`font-pixel text-[8px] ${STATUS_COLORS[room.status] ?? STATUS_COLORS.waiting} ${room.status === 'playing' ? 'animate-blink' : ''}`}>
                    {STATUS_LABELS[room.status] ?? '空闲'}
                  </div>
                  <PixelDoor status={doorStatus} scale={3} />
                  <span className="font-pixel text-[8px] text-pixel-tile">
                    {room.playerCount}/{room.maxPlayers}
                  </span>
                  <span className="font-pixel text-[7px] text-pixel-tile/50">#{room.roomId}</span>
                </button>
              )
            })
          )}
        </div>

        {/* 底部操作面板 */}
        <PixelPanel className="w-full max-w-lg">
          <div className="flex flex-col gap-4">
            {/* 用户状态 */}
            <div className="flex items-center justify-between">
              {authUser ? (
                <div className="flex items-center gap-2">
                  <span className="text-pixel-green text-xs">已登录: {authUser.nickname}</span>
                  <button onClick={handleLogout} className="text-pixel-tile/60 text-[10px] hover:text-pixel-red">
                    退出登录
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="text-pixel-blue text-xs hover:text-pixel-yellow"
                >
                  登录/注册（可选）
                </button>
              )}
            </div>

            {/* 昵称 */}
            <div className="flex items-center gap-3">
              <label className="text-pixel-tile text-xs w-14 shrink-0">昵称</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="你的昵称..."
                maxLength={12}
                className="pixel-input flex-1"
                disabled={!!authUser}
              />
            </div>

            {/* 房间号 */}
            <div className="flex items-center gap-3">
              <label className="text-pixel-tile text-xs w-14 shrink-0">房间号</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="输入房间号..."
                maxLength={6}
                className="pixel-input flex-1"
              />
              <button onClick={handleJoinRoom} className="pixel-btn text-sm">
                加入
              </button>
            </div>

            {/* 分隔线 */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-[2px] bg-pixel-border/50" />
              <span className="text-pixel-border text-xs">OR</span>
              <div className="flex-1 h-[2px] bg-pixel-border/50" />
            </div>

            {/* 创建按钮 */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="pixel-btn pixel-btn-primary w-full py-3 text-sm tracking-wider"
            >
              创建新厕所
            </button>
          </div>
        </PixelPanel>

        {/* 底部水管装饰 */}
        <div className="mt-8 flex items-center">
          <PixelPipe length={200} direction="horizontal" />
        </div>
      </div>

      {/* 创建房间弹窗 */}
      <CreateRoomModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateRoom}
      />

      {/* 登录/注册弹窗 */}
      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAuth(false)}>
          <div className="pixel-panel p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-4 mb-4">
              <button
                className={`text-sm ${authMode === 'login' ? 'text-pixel-yellow pixel-text-shadow' : 'text-pixel-tile/60'}`}
                onClick={() => { setAuthMode('login'); setAuthError('') }}
              >
                登录
              </button>
              <button
                className={`text-sm ${authMode === 'register' ? 'text-pixel-yellow pixel-text-shadow' : 'text-pixel-tile/60'}`}
                onClick={() => { setAuthMode('register'); setAuthError('') }}
              >
                注册
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                placeholder="用户名"
                className="pixel-input w-full"
              />
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="密码"
                className="pixel-input w-full"
              />
              {authMode === 'register' && (
                <input
                  type="text"
                  value={authNickname}
                  onChange={(e) => setAuthNickname(e.target.value)}
                  placeholder="昵称（可选）"
                  className="pixel-input w-full"
                />
              )}
              {authError && <p className="text-pixel-red text-xs">{authError}</p>}
              <button
                onClick={handleAuth}
                disabled={authLoading || !authUsername || !authPassword}
                className="pixel-btn pixel-btn-primary w-full py-2 text-sm disabled:opacity-50"
              >
                {authLoading ? '处理中...' : authMode === 'login' ? '登录' : '注册'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToiletScene>
  )
}
