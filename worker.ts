import { Hono } from 'hono'
import { GameRoom } from './durable-objects/GameRoom'
import { hashPassword, verifyPassword } from './shared/crypto'
import { sanitizeName } from './durable-objects/game-validation'
import wordsData from './data/words.json'
import { GAME_CONSTANTS } from './shared/constants'

export { GameRoom }

const app = new Hono<{ Bindings: Env }>()

// ---- Auth ----

const SESSION_TTL = 7 * 24 * 3600

function nowUnix(): number {
  return Math.floor(Date.now() / 1000)
}

function extractToken(c: { req: { header: (name: string) => string | undefined } }): string | undefined {
  return c.req.header('Authorization')?.replace('Bearer ', '')
}

async function createSession(db: D1Database, userId: string): Promise<string> {
  const token = crypto.randomUUID()
  const now = nowUnix()
  await db.prepare(
    'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
  ).bind(token, userId, now, now + SESSION_TTL).run()
  return token
}

app.post('/api/auth/register', async (c) => {
  const body = await c.req.json<{
    username: string
    password: string
    nickname: string
  }>()

  if (!body.username || !body.password || !body.nickname) {
    return c.json({ error: '缺少必填字段' }, 400)
  }
  if (body.username.length < 3 || body.username.length > 20) {
    return c.json({ error: '用户名长度需3-20位' }, 400)
  }
  if (body.password.length < 6 || body.password.length > 64) {
    return c.json({ error: '密码长度需6-64位' }, 400)
  }
  if (body.nickname.length > 20) {
    return c.json({ error: '昵称最长20字' }, 400)
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(body.username).first()
  if (existing) {
    return c.json({ error: '用户名已被注册' }, 409)
  }

  const userId = crypto.randomUUID()
  const passwordHash = await hashPassword(body.password)
  const nickname = sanitizeName(body.nickname || body.username)

  await c.env.DB.prepare(
    'INSERT INTO users (id, username, password_hash, nickname) VALUES (?, ?, ?, ?)',
  ).bind(userId, body.username, passwordHash, nickname).run()

  const token = await createSession(c.env.DB, userId)

  return c.json({
    token,
    user: { id: userId, username: body.username, nickname },
  }, 201)
})

app.post('/api/auth/login', async (c) => {
  const body = await c.req.json<{
    username: string
    password: string
  }>()

  if (!body.username || !body.password) {
    return c.json({ error: '缺少必填字段' }, 400)
  }

  const user = await c.env.DB.prepare(
    'SELECT id, username, nickname, password_hash FROM users WHERE username = ?',
  ).bind(body.username).first<{ id: string; username: string; nickname: string; password_hash: string }>()

  if (!user) {
    return c.json({ error: '用户名或密码错误' }, 401)
  }

  const valid = await verifyPassword(body.password, user.password_hash)
  if (!valid) {
    return c.json({ error: '用户名或密码错误' }, 401)
  }

  const token = await createSession(c.env.DB, user.id)

  return c.json({
    token,
    user: { id: user.id, username: user.username, nickname: user.nickname },
  })
})

app.post('/api/auth/logout', async (c) => {
  const token = extractToken(c)
  if (token) {
    await c.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
  }
  return c.json({ ok: true })
})

app.get('/api/auth/me', async (c) => {
  const token = extractToken(c)
  if (!token) {
    return c.json({ error: '未登录' }, 401)
  }

  const user = await c.env.DB.prepare(
    `SELECT u.id, u.username, u.nickname, u.total_games, u.total_wins, u.total_score
     FROM sessions s JOIN users u ON s.user_id = u.id
     WHERE s.token = ? AND s.expires_at > ?`,
  ).bind(token, nowUnix()).first()

  if (!user) {
    return c.json({ error: '会话过期' }, 401)
  }

  return c.json({ user })
})

// ---- Rooms ----

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

app.get('/api/rooms', async (c) => {
  const list = await c.env.WORD_KV.list({ prefix: 'room:list:' })
  const rooms = await Promise.all(
    list.keys.map(async (key) => {
      const data = await c.env.WORD_KV.get(key.name, 'json')
      return data
    }),
  )
  return c.json({ rooms: rooms.filter(Boolean) })
})

app.post('/api/rooms', async (c) => {
  const body = await c.req.json<{
    settings: {
      maxPlayers: number
      rounds: number
      drawTime: number
      wordDifficulty?: string
      customWords?: string[]
    }
    hostId: string
    hostName: string
    hostColor: number
  }>()

  let roomId = ''
  for (let i = 0; i < 10; i++) {
    const candidate = generateRoomCode()
    const existing = await c.env.WORD_KV.get(`room:list:${candidate}`)
    if (!existing) {
      roomId = candidate
      break
    }
  }
  if (!roomId) {
    return c.json({ error: '无法生成房间码，请重试' }, 500)
  }

  const doId = c.env.GAME_ROOM.idFromName(roomId)
  const room = c.env.GAME_ROOM.get(doId)

  const settings = {
    maxPlayers: body.settings.maxPlayers,
    rounds: body.settings.rounds,
    drawTime: body.settings.drawTime,
    wordDifficulty: (body.settings.wordDifficulty ?? 'medium') as 'easy' | 'medium' | 'hard',
    customWords: body.settings.customWords ?? [],
  }

  await room.fetch(new Request('https://internal/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomId,
      settings,
      hostId: body.hostId,
      hostName: body.hostName,
      hostColor: body.hostColor,
    }),
  }))

  await c.env.WORD_KV.put(
    `room:list:${roomId}`,
    JSON.stringify({
      roomId,
      status: 'waiting',
      playerCount: 0,
      maxPlayers: settings.maxPlayers,
    }),
    { expirationTtl: 3600 },
  )

  return c.json({ roomId }, 201)
})

app.get('/api/rooms/:id', async (c) => {
  const roomId = c.req.param('id')
  if (!roomId) {
    return c.json({ error: 'Room ID is required' }, 400)
  }

  const doId = c.env.GAME_ROOM.idFromName(roomId)
  const room = c.env.GAME_ROOM.get(doId)

  const res = await room.fetch(new Request('https://internal/info', { method: 'GET' }))
  if (!res.ok) {
    return c.json({ error: 'Room not found' }, 404)
  }

  const data = await res.json()
  return c.json(data)
})

// ---- Words ----

const CATEGORIES = Object.entries(wordsData).map(([key, words]) => ({
  key,
  name: GAME_CONSTANTS.WORD_CATEGORY_NAMES[key as keyof typeof GAME_CONSTANTS.WORD_CATEGORY_NAMES] ?? key,
  count: words.length,
}))
const TOTAL_WORDS = Object.values(wordsData).flat().length

app.get('/api/words', async (c) => {
  return c.json({ categories: CATEGORIES, totalWords: TOTAL_WORDS })
})

// ---- WebSocket ----

app.get('/ws/:roomId', async (c) => {
  const roomId = c.req.param('roomId')
  const doId = c.env.GAME_ROOM.idFromName(roomId)
  const room = c.env.GAME_ROOM.get(doId)
  return room.fetch(c.req.raw)
})

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // WebSocket 升级请求直接转发到 DO，绕过 assets
    const url = new URL(request.url)
    if (request.headers.get('Upgrade') === 'websocket' && url.pathname.startsWith('/ws/')) {
      const roomId = url.pathname.split('/')[2]
      const doId = env.GAME_ROOM.idFromName(roomId)
      const room = env.GAME_ROOM.get(doId)
      return room.fetch(request)
    }
    return app.fetch(request, env, ctx)
  },
} satisfies ExportedHandler<Env>
