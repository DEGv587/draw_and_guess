import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ToiletScene, PixelPanel } from '../components/ui/PixelScene'
import { PixelPipe, PixelPoop } from '../components/ui/PixelSprite'
import { usePlayerStore } from '../stores/playerStore'
import { api } from '../utils/api'

interface UserItem {
  id: string
  username: string
  nickname: string
  isAdmin: boolean
}

export default function Manage() {
  const navigate = useNavigate()
  const { authUser, authToken } = usePlayerStore()
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(false)

  // 非管理员跳回首页
  useEffect(() => {
    if (!authUser?.isAdmin) navigate('/', { replace: true })
  }, [authUser, navigate])

  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : undefined

  const fetchUsers = async (query = '') => {
    setLoading(true)
    try {
      const params = query ? `?search=${encodeURIComponent(query)}` : ''
      const res = await api.get<{ users: UserItem[] }>(`/admin/users${params}`, headers)
      setUsers(res.users)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  // 初始加载
  useEffect(() => {
    if (authUser?.isAdmin) fetchUsers()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => fetchUsers(search.trim())

  const toggleAdmin = async (user: UserItem) => {
    const newVal = !user.isAdmin
    try {
      await api.post(`/admin/users/${user.id}`, { isAdmin: newVal }, headers)
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isAdmin: newVal } : u)))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '操作失败')
    }
  }

  if (!authUser?.isAdmin) return null

  return (
    <ToiletScene wallRatio={62} className="scanlines">
      <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">

        {/* 水管装饰 */}
        <div className="flex items-center gap-0 mb-6">
          <PixelPipe length={60} direction="horizontal" />
          <div className="w-3 h-3 bg-pixel-pipe-dark rounded-full" />
          <PixelPipe length={40} direction="vertical" className="ml-[-6px]" />
        </div>

        {/* 标题 */}
        <div className="text-center mb-2">
          <h1 className="font-pixel text-xl md:text-2xl text-pixel-yellow pixel-text-glow tracking-wider mb-3">
            MANAGE
          </h1>
          <p className="text-pixel-tile text-sm tracking-widest mb-1">
            —— 所长管理 ——
          </p>
        </div>

        {/* 装饰 */}
        <div className="flex items-center gap-2 mb-8">
          <PixelPoop scale={2} />
          <div className="w-16 h-[2px] bg-pixel-border" />
          <PixelPoop scale={2} />
        </div>

        {/* 主面板 */}
        <PixelPanel className="w-full max-w-lg">
          <div className="flex flex-col gap-4">

            {/* 搜索栏 */}
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜索用户名/昵称..."
                className="pixel-input flex-1"
              />
              <button onClick={handleSearch} className="pixel-btn pixel-btn-primary text-sm">
                搜索
              </button>
            </div>

            {/* 用户列表 */}
            <div className="pixel-panel-inset max-h-[400px] overflow-y-auto">
              {loading ? (
                <p className="text-pixel-tile/60 text-xs text-center py-4">加载中...</p>
              ) : users.length === 0 ? (
                <p className="text-pixel-tile/60 text-xs text-center py-4">暂无用户</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between px-3 py-2 hover:bg-pixel-panel-light/30 transition-colors"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-pixel-tile text-xs truncate">{user.nickname}</span>
                        <span className="text-pixel-tile/40 text-[10px] truncate">@{user.username}</span>
                      </div>
                      <button
                        onClick={() => toggleAdmin(user)}
                        className={`shrink-0 w-12 h-6 rounded-none relative transition-colors ${
                          user.isAdmin
                            ? 'bg-pixel-green-dark'
                            : 'bg-pixel-border-dark'
                        }`}
                        style={{
                          boxShadow: user.isAdmin
                            ? 'inset -2px -2px 0 #0f4a22, inset 2px 2px 0 #1a7a3a'
                            : 'inset -2px -2px 0 #2a2a3a, inset 2px 2px 0 #4a4a6a',
                        }}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 bg-pixel-white transition-all ${
                            user.isAdmin ? 'left-[26px]' : 'left-0.5'
                          }`}
                          style={{
                            boxShadow: 'inset -1px -1px 0 #c0c0c0, inset 1px 1px 0 #ffffff',
                          }}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 返回按钮 */}
            <button
              onClick={() => navigate('/')}
              className="pixel-btn w-full py-2 text-sm tracking-wider"
            >
              返回首页
            </button>
          </div>
        </PixelPanel>

        {/* 底部水管 */}
        <div className="mt-8 flex items-center">
          <PixelPipe length={200} direction="horizontal" />
        </div>
      </div>
    </ToiletScene>
  )
}
