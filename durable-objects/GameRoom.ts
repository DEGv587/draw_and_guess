import { DurableObject } from 'cloudflare:workers'
import type { RoomSettings, PlayerState, GameRoomState, RoomState, Player, DrawAction, PlayerScore } from '../shared/types'
import { GAME_CONSTANTS } from '../shared/constants'
import { pickRandomWords, shuffleArray } from './game-words'
import { calcGuesserScore, calcDrawerScore, buildRankings } from './game-scoring'
import { validateMessage, sanitizeName, checkRateLimit } from './game-validation'
import { serializeState, deserializeState } from './game-serialization'

export class GameRoom extends DurableObject<Env> {
  private state: GameRoomState | null = null
  private usedWords: Set<string> = new Set()
  private wordCandidates: string[] = []
  private rateLimits: Map<string, number[]> = new Map()
  private drawSaveTimer: ReturnType<typeof setTimeout> | null = null

  // ---- 状态持久化 ----

  private async loadState(): Promise<GameRoomState | null> {
    if (this.state) return this.state
    const map = await this.ctx.storage.get(['roomState', 'usedWords', 'wordCandidates'])
    const stored = map.get('roomState') as GameRoomState | undefined
    if (stored) {
      this.state = deserializeState(stored)
      const used = map.get('usedWords') as string[] | undefined
      if (used) this.usedWords = new Set(used)
      const candidates = map.get('wordCandidates') as string[] | undefined
      if (candidates) this.wordCandidates = candidates
    }
    return this.state
  }

  private async saveState(): Promise<void> {
    if (!this.state) return
    await this.ctx.storage.put({
      roomState: serializeState(this.state),
      usedWords: Array.from(this.usedWords),
      wordCandidates: this.wordCandidates,
    })
  }

  // ---- 状态转换 ----

  private toPlayer(p: PlayerState): Player {
    return {
      id: p.id,
      name: p.name,
      color: p.color,
      score: p.score,
      isReady: p.isReady,
      isHost: p.id === this.state!.hostId,
      isConnected: p.isConnected,
      poopCount: p.poopCount,
      seatIndex: p.seatIndex,
      isAdmin: p.isAdmin,
    }
  }

  private toRoomState(): RoomState {
    const s = this.state!
    const drawerId = this.currentDrawerId() ?? null

    let timeLeft = 0
    if (s.roundStartTime > 0) {
      const elapsed = (Date.now() - s.roundStartTime) / 1000
      if (s.status === 'choosing') {
        timeLeft = Math.max(0, Math.ceil(GAME_CONSTANTS.CHOOSE_WORD_TIME - elapsed))
      } else if (s.status === 'drawing') {
        timeLeft = Math.max(0, Math.ceil(s.settings.drawTime - elapsed))
      }
    }

    return {
      roomId: s.roomId,
      status: s.status,
      players: Array.from(s.players.values()).map((p) => this.toPlayer(p)),
      currentRound: s.currentRound,
      totalRounds: s.settings.rounds,
      currentDrawer: drawerId,
      hint: this.buildHint(),
      timeLeft,
      settings: s.settings,
    }
  }

  private toRoomSummary() {
    const s = this.state!
    return {
      roomId: s.roomId,
      status: s.status,
      playerCount: this.connectedPlayerCount(),
      maxPlayers: s.settings.maxPlayers,
    }
  }

  private buildHint(): string | null {
    const s = this.state
    if (!s || !s.currentWord) return null
    const chars = [...s.currentWord]
    return chars.map((ch, i) => (s.hintRevealed.includes(i) ? ch : '_')).join(' ')
  }

  private connectedPlayerCount(): number {
    return Array.from(this.state!.players.values()).filter((p) => p.isConnected).length
  }

  private currentDrawerId(): string | undefined {
    return this.state!.drawOrder[this.state!.currentDrawerIndex]
  }

  // ---- fetch 入口 ----

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // WebSocket 升级
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair)
      this.ctx.acceptWebSocket(server)

      const playerId = url.searchParams.get('playerId')
      const rawName = url.searchParams.get('name')
      const color = parseInt(url.searchParams.get('color') ?? '0', 10)
      const isAdmin = url.searchParams.get('admin') === '1'
      const name = rawName ? sanitizeName(rawName) : null

      if (playerId && name) {
        await this.loadState()
        if (this.state) {
          const existing = this.state.players.get(playerId)
          const isReconnect = !!existing
          if (existing) {
            existing.isConnected = true
            existing.lastDisconnect = null
          } else {
            // 找到第一个空坑位
            const usedSeats = new Set(
              Array.from(this.state.players.values()).map((p) => p.seatIndex),
            )
            let seatIndex = 0
            while (usedSeats.has(seatIndex)) seatIndex++

            // 分配不重复的颜色
            const usedColors = new Set(
              Array.from(this.state.players.values()).map((p) => p.color),
            )
            let assignedColor = color
            if (usedColors.has(assignedColor)) {
              for (let c = 0; c < 8; c++) {
                if (!usedColors.has(c)) { assignedColor = c; break }
              }
            }

            // 随机粑粑道具
            const initialPoop =
              GAME_CONSTANTS.SEAT_POOP_MIN +
              Math.floor(Math.random() * (GAME_CONSTANTS.SEAT_POOP_MAX - GAME_CONSTANTS.SEAT_POOP_MIN + 1))

            this.state.players.set(playerId, {
              id: playerId,
              name,
              color: assignedColor,
              score: 0,
              isReady: false,
              isConnected: true,
              poopCount: isAdmin ? GAME_CONSTANTS.ADMIN_POOP_COUNT : initialPoop,
              seatIndex,
              lastDisconnect: null,
              isAdmin,
            })
            if (this.state.players.size === 1) {
              this.state.hostId = playerId
            }
          }

          server.serializeAttachment({ playerId })
          await this.saveState()

          server.send(JSON.stringify({ type: 'room_state', data: this.toRoomState() }))

          if (this.state.status === 'drawing' && this.state.drawActions.length > 0) {
            for (const action of this.state.drawActions) {
              server.send(JSON.stringify({ type: 'draw', data: action }))
            }
          }

          // 只对新玩家广播加入消息，重连不广播
          if (!isReconnect) {
            this.broadcast({ type: 'player_joined', player: this.toPlayer(this.state.players.get(playerId)!) }, playerId)
          }
          this.syncKvRoomEntry().catch(() => {})
        }
      }

      return new Response(null, { status: 101, webSocket: client })
    }

    // POST: 初始化房间
    if (request.method === 'POST') {
      const body = (await request.json()) as {
        roomId: string
        settings: RoomSettings
        hostId: string
      }
      this.state = {
        roomId: body.roomId,
        status: 'waiting',
        players: new Map(),
        settings: body.settings,
        hostId: body.hostId,
        currentRound: 0,
        currentDrawerIndex: 0,
        drawOrder: [],
        currentWord: null,
        hintRevealed: [],
        guessedPlayers: new Map(),
        roundStartTime: 0,
        drawActions: [],
      }
      this.usedWords = new Set()
      await this.saveState()
      return Response.json({ ok: true, roomId: body.roomId })
    }

    // GET: 房间摘要
    if (request.method === 'GET') {
      await this.loadState()
      if (!this.state) return Response.json({ error: 'Room not found' }, { status: 404 })
      return Response.json(this.toRoomSummary())
    }

    return new Response('Not found', { status: 404 })
  }

  // ---- WebSocket 消息处理 ----

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') return

    const attachment = ws.deserializeAttachment() as { playerId: string } | null
    if (!attachment) return
    const pid = attachment.playerId

    try {
      const msg = JSON.parse(message)

      // draw / draw_batch 走快速路径，跳过 loadState 减少延迟
      if (msg.type === 'draw' || msg.type === 'draw_batch') {
        await this.loadState()
        if (!this.state || this.state.status !== 'drawing') return
        if (pid !== this.currentDrawerId()) return

        if (msg.type === 'draw_batch') {
          this.handleDrawBatch(pid, msg.data as DrawAction[])
        } else {
          this.handleDraw(pid, msg.data as DrawAction)
        }
        return
      }

      await this.loadState()
      if (!this.state) return

      const validation = validateMessage(msg)
      if (!validation.valid) {
        ws.send(JSON.stringify({ type: 'error', message: validation.reason }))
        return
      }

      // 速率限制（draw 消息已经在上面处理，不需要限速）
      const timestamps = this.rateLimits.get(pid) ?? []
      const rateCheck = checkRateLimit(timestamps, Date.now())
      this.rateLimits.set(pid, rateCheck.updated)
      if (!rateCheck.allowed) {
        ws.send(JSON.stringify({ type: 'error', message: '消息太频繁' }))
        return
      }

      switch (msg.type) {
        case 'ready':
          this.handleReady(pid)
          break
        case 'start_game':
          this.handleStartGame(pid, ws)
          break
        case 'choose_word':
          this.handleChooseWord(pid, msg.word)
          break
        case 'guess':
          this.handleGuess(pid, msg.word)
          break
        case 'chat':
          this.handleChat(pid, msg.message)
          break
        case 'throw_poop':
          this.handleThrowPoop(pid, msg.targetId)
          break
        case 'select_seat':
          this.handleSelectSeat(pid, msg.seatIndex)
          break
        case 'play_again':
          await this.handlePlayAgain()
          break
        default:
          break
      }
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }))
    }
  }

  // ---- 消息处理器 ----

  private async handleReady(pid: string) {
    const player = this.state!.players.get(pid)
    if (!player || this.state!.status !== 'waiting') return
    player.isReady = !player.isReady
    await this.saveState()
    this.broadcastRoomState()
  }

  private async handleStartGame(pid: string, ws: WebSocket) {
    const s = this.state!
    if (pid !== s.hostId || s.status !== 'waiting') return

    const readyPlayers = Array.from(s.players.values()).filter((p) => p.isConnected && p.isReady)
    if (readyPlayers.length < GAME_CONSTANTS.MIN_PLAYERS) {
      ws.send(JSON.stringify({ type: 'error', message: '至少需要2名玩家准备就绪' }))
      return
    }

    s.drawOrder = shuffleArray(readyPlayers.map((p) => p.id))
    s.currentRound = 1
    s.currentDrawerIndex = 0
    this.usedWords = new Set()

    await this.startChoosingPhase()
    this.syncKvRoomEntry().catch(() => {})
  }

  private async handleChooseWord(pid: string, word: string) {
    const s = this.state!
    if (s.status !== 'choosing') return
    if (pid !== this.currentDrawerId()) return
    if (!this.wordCandidates.includes(word)) return

    s.currentWord = word
    this.usedWords.add(word)
    await this.startDrawingPhase()
  }

  private async handleDraw(pid: string, data: DrawAction) {
    const s = this.state!
    if (s.status !== 'drawing') return
    if (pid !== this.currentDrawerId()) return

    if (data.action === 'clear') {
      s.drawActions = []
    } else if (data.action === 'undo') {
      let lastStart = -1
      for (let i = s.drawActions.length - 1; i >= 0; i--) {
        if (s.drawActions[i].action === 'start') {
          lastStart = i
          break
        }
      }
      if (lastStart >= 0) {
        s.drawActions = s.drawActions.slice(0, lastStart)
      }
    } else {
      s.drawActions.push(data)
    }

    this.broadcast({ type: 'draw', data }, pid)
    this.scheduleDebouncedSave()
  }

  private handleDrawBatch(pid: string, actions: DrawAction[]) {
    const s = this.state!
    if (!Array.isArray(actions) || actions.length === 0) return

    for (const data of actions) {
      if (data.action === 'clear') {
        s.drawActions = []
      } else if (data.action === 'undo') {
        let lastStart = -1
        for (let i = s.drawActions.length - 1; i >= 0; i--) {
          if (s.drawActions[i].action === 'start') {
            lastStart = i
            break
          }
        }
        if (lastStart >= 0) {
          s.drawActions = s.drawActions.slice(0, lastStart)
        }
      } else {
        s.drawActions.push(data)
      }
    }

    // 批量转发，一条消息包含所有 actions
    this.broadcast({ type: 'draw_batch', data: actions }, pid)
    this.scheduleDebouncedSave()
  }

  private scheduleDebouncedSave() {
    if (this.drawSaveTimer) return
    this.drawSaveTimer = setTimeout(async () => {
      this.drawSaveTimer = null
      await this.saveState()
    }, 2000)
  }

  private async handleGuess(pid: string, word: string) {
    const s = this.state!
    if (s.status !== 'drawing') return
    if (pid === this.currentDrawerId()) return
    if (s.guessedPlayers.has(pid)) return

    const player = s.players.get(pid)
    if (!player) return

    const isCorrect = word.trim().toLowerCase() === s.currentWord?.trim().toLowerCase()

    if (isCorrect) {
      const elapsed = (Date.now() - s.roundStartTime) / 1000
      const remaining = Math.max(0, s.settings.drawTime - elapsed)
      const ratio = remaining / s.settings.drawTime
      const score = calcGuesserScore(elapsed, s.settings.drawTime)

      player.score += score
      // 只有第一个猜对的人奖励粑粑道具
      if (s.guessedPlayers.size === 0) {
        player.poopCount += 1
      }
      s.guessedPlayers.set(pid, { score, ratio })

      this.broadcast({ type: 'guess_result', correct: true, player: player.name })

      const nonDrawers = Array.from(s.players.values()).filter(
        (p) => p.isConnected && p.id !== this.currentDrawerId(),
      )
      if (nonDrawers.every((p) => s.guessedPlayers.has(p.id))) {
        await this.endRound()
        return
      }

      await this.saveState()
      this.broadcastRoomState()
    } else {
      this.broadcast({ type: 'guess_result', correct: false, player: player.name })
      this.broadcast({ type: 'chat', player: player.name, message: word }, pid)
    }
  }

  private handleChat(pid: string, message: string) {
    const player = this.state!.players.get(pid)
    if (!player) return
    this.broadcast({ type: 'chat', player: player.name, message }, pid)
  }

  private async handleThrowPoop(pid: string, targetId: string) {
    const s = this.state!
    const thrower = s.players.get(pid)
    const target = s.players.get(targetId)
    if (!thrower || !target || (!thrower.isAdmin && thrower.poopCount <= 0)) return
    if (pid === targetId) return

    if (!thrower.isAdmin) {
      thrower.poopCount -= 1
    }
    await this.saveState()

    this.broadcast({
      type: 'poop_hit',
      fromPlayer: thrower.name,
      targetPlayer: target.name,
    })
    this.broadcastRoomState()
  }

  private async handleSelectSeat(pid: string, seatIndex: number) {
    const s = this.state!
    if (s.status !== 'waiting') return
    const player = s.players.get(pid)
    if (!player) return
    if (seatIndex < 0 || seatIndex >= s.settings.maxPlayers) return

    // 检查目标坑位是否已被占用
    const occupied = Array.from(s.players.values()).some(
      (p) => p.id !== pid && p.isConnected && p.seatIndex === seatIndex,
    )
    if (occupied) return

    player.seatIndex = seatIndex
    await this.saveState()
    this.broadcastRoomState()
  }

  // ---- 游戏状态机 ----

  private async startChoosingPhase() {
    const s = this.state!
    s.status = 'choosing'
    s.currentWord = null
    s.hintRevealed = []
    s.guessedPlayers = new Map()
    s.drawActions = []
    s.roundStartTime = Date.now()

    this.wordCandidates = pickRandomWords(GAME_CONSTANTS.WORD_CHOICES_COUNT, this.usedWords)

    const drawerId = this.currentDrawerId()!
    const drawer = s.players.get(drawerId)

    await this.saveState()

    this.broadcast({
      type: 'round_start',
      drawer: drawer?.name ?? '?',
      hint: '',
      duration: GAME_CONSTANTS.CHOOSE_WORD_TIME,
      phase: 'choosing',
      round: s.currentRound,
      isNewRound: s.currentDrawerIndex === 0,
    })

    this.sendToPlayer(drawerId, { type: 'choose_words', words: this.wordCandidates })
    this.ctx.storage.setAlarm(Date.now() + GAME_CONSTANTS.CHOOSE_WORD_TIME * 1000)
  }

  private async startDrawingPhase() {
    const s = this.state!
    s.status = 'drawing'
    s.roundStartTime = Date.now()
    s.drawActions = []

    const wordLen = [...(s.currentWord ?? '')].length
    s.hintRevealed = []

    await this.saveState()

    this.broadcast({
      type: 'round_start',
      drawer: s.players.get(this.currentDrawerId()!)?.name ?? '?',
      hint: this.buildHint() ?? Array(wordLen).fill('_').join(' '),
      duration: s.settings.drawTime,
      phase: 'drawing',
      round: s.currentRound,
      isNewRound: s.currentDrawerIndex === 0,
    })

    // 告知画手当前词（覆盖手动选词和超时自动选词两种情况）
    if (s.currentWord) {
      this.sendToPlayer(this.currentDrawerId()!, { type: 'current_word', word: s.currentWord })
    }

    const hintTime = s.settings.drawTime * GAME_CONSTANTS.HINT_REVEAL_RATIO * 1000
    this.ctx.storage.setAlarm(Date.now() + hintTime)
  }

  private async revealHint() {
    const s = this.state!
    if (!s.currentWord || s.status !== 'drawing') return

    const chars = [...s.currentWord]
    const unrevealed = chars.map((_, i) => i).filter((i) => !s.hintRevealed.includes(i))
    if (unrevealed.length === 0) return

    const idx = unrevealed[Math.floor(Math.random() * unrevealed.length)]
    s.hintRevealed.push(idx)

    await this.saveState()
    this.broadcast({ type: 'hint_update', hint: this.buildHint()! })

    const elapsed = (Date.now() - s.roundStartTime) / 1000
    const remaining = Math.max(0, s.settings.drawTime - elapsed)
    if (remaining > 0) {
      this.ctx.storage.setAlarm(Date.now() + remaining * 1000)
    }
  }

  private async endRound() {
    const s = this.state!

    if (this.drawSaveTimer) {
      clearTimeout(this.drawSaveTimer)
      this.drawSaveTimer = null
    }

    const drawerId = this.currentDrawerId()!
    const drawer = s.players.get(drawerId)
    const guessedCount = s.guessedPlayers.size
    const scores: Record<string, number> = {}

    // 猜词者得分（已在 handleGuess 中加到 player.score，这里记录到 scores 用于前端展示）
    for (const [pid, data] of s.guessedPlayers) {
      scores[pid] = data.score
    }

    // 画手得分：用猜对者的实际平均剩余时间比例
    if (drawer && guessedCount > 0) {
      const avgRatio = Array.from(s.guessedPlayers.values())
        .reduce((sum, d) => sum + d.ratio, 0) / guessedCount
      const drawerScore = calcDrawerScore(guessedCount, avgRatio)
      drawer.score += drawerScore
      scores[drawerId] = drawerScore
    }

    s.status = 'round_end'
    await this.saveState()

    this.broadcast({
      type: 'round_end',
      word: s.currentWord ?? '',
      scores,
    })

    this.ctx.storage.setAlarm(Date.now() + GAME_CONSTANTS.ROUND_END_DISPLAY_TIME * 1000)
  }

  private async advanceToNextDrawer() {
    const s = this.state!

    s.currentDrawerIndex++

    while (
      s.currentDrawerIndex < s.drawOrder.length &&
      !s.players.get(this.currentDrawerId()!)?.isConnected
    ) {
      s.currentDrawerIndex++
    }

    if (s.currentDrawerIndex >= s.drawOrder.length) {
      s.currentRound++
      if (s.currentRound > s.settings.rounds) {
        await this.endGame()
        return
      }
      const connected = Array.from(s.players.values())
        .filter((p) => p.isConnected)
        .map((p) => p.id)
      s.drawOrder = shuffleArray(connected)
      s.currentDrawerIndex = 0
    }

    const connectedCount = this.connectedPlayerCount()
    if (connectedCount < GAME_CONSTANTS.MIN_PLAYERS) {
      await this.endGame()
      return
    }

    await this.startChoosingPhase()
  }

  private async endGame() {
    const s = this.state!
    s.status = 'game_end'

    const rankings = buildRankings(s.players, (p) => this.toPlayer(p))

    await this.saveState()
    this.broadcast({ type: 'game_end', rankings })

    this.writeGameRecord(rankings).catch(() => {})
    this.syncKvRoomEntry().catch(() => {})
  }

  private async handlePlayAgain() {
    const s = this.state!
    if (s.status !== 'game_end') return

    for (const p of s.players.values()) {
      p.score = 0
      p.isReady = false
      p.poopCount = p.isAdmin ? GAME_CONSTANTS.ADMIN_POOP_COUNT :
        GAME_CONSTANTS.SEAT_POOP_MIN +
        Math.floor(Math.random() * (GAME_CONSTANTS.SEAT_POOP_MAX - GAME_CONSTANTS.SEAT_POOP_MIN + 1))
    }

    s.status = 'waiting'
    s.currentRound = 0
    s.currentDrawerIndex = 0
    s.drawOrder = []
    s.currentWord = null
    s.hintRevealed = []
    s.guessedPlayers = new Map()
    s.roundStartTime = 0
    s.drawActions = []
    this.usedWords = new Set()
    this.wordCandidates = []

    await this.saveState()
    this.broadcastRoomState()
    this.syncKvRoomEntry().catch(() => {})
  }

  // ---- alarm 处理（单槽策略） ----

  async alarm(): Promise<void> {
    await this.loadState()
    if (!this.state) return

    const s = this.state

    const anyConnected = Array.from(s.players.values()).some((p) => p.isConnected)
    if (!anyConnected) {
      const kv = this.env.WORD_KV
      if (kv) await kv.delete(`room:list:${s.roomId}`).catch(() => {})
      await this.ctx.storage.deleteAll()
      this.state = null
      return
    }

    switch (s.status) {
      case 'choosing': {
        if (this.wordCandidates.length > 0) {
          const word = this.wordCandidates[Math.floor(Math.random() * this.wordCandidates.length)]
          s.currentWord = word
          this.usedWords.add(word)
          await this.startDrawingPhase()
        }
        break
      }
      case 'drawing': {
        const elapsed = (Date.now() - s.roundStartTime) / 1000
        if (elapsed < s.settings.drawTime - 1) {
          await this.revealHint()
        } else {
          await this.endRound()
        }
        break
      }
      case 'round_end': {
        await this.advanceToNextDrawer()
        break
      }
      default:
        break
    }
  }

  // ---- WebSocket 关闭 ----

  async webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): Promise<void> {
    await this.loadState()
    if (!this.state) return

    const attachment = ws.deserializeAttachment() as { playerId: string } | null
    if (!attachment) return
    const pid = attachment.playerId

    const player = this.state.players.get(pid)
    if (!player) return

    // 检查同一 playerId 是否还有其他活跃连接
    const hasOtherWs = this.ctx.getWebSockets().some((other) => {
      if (other === ws) return false
      const att = other.deserializeAttachment() as { playerId: string } | null
      return att?.playerId === pid
    })
    if (hasOtherWs) return // 还有其他连接，不处理断线

    player.isConnected = false
    player.lastDisconnect = Date.now()
    this.rateLimits.delete(pid)

    if (pid === this.state.hostId) {
      const nextHost = Array.from(this.state.players.values()).find(
        (p) => p.isConnected && p.id !== pid,
      )
      if (nextHost) {
        this.state.hostId = nextHost.id
        this.broadcast({ type: 'host_changed', newHost: nextHost.name })
      }
    }

    await this.saveState()
    this.broadcast({ type: 'player_left', player: this.toPlayer(player) })
    this.syncKvRoomEntry().catch(() => {})

    if (
      (this.state.status === 'drawing' || this.state.status === 'choosing') &&
      pid === this.state.drawOrder[this.state.currentDrawerIndex]
    ) {
      await this.endRound()
      return
    }

    const connectedCount = this.connectedPlayerCount()
    if (connectedCount === 0) {
      this.ctx.storage.setAlarm(Date.now() + 60_000)
    } else if (connectedCount < GAME_CONSTANTS.MIN_PLAYERS && this.state.status !== 'waiting') {
      await this.endGame()
    }
  }

  // ---- D1 / KV 集成 ----

  private async writeGameRecord(rankings: PlayerScore[]): Promise<void> {
    const db = this.env.DB
    if (!db) return
    const s = this.state
    if (!s) return

    const gameId = crypto.randomUUID()

    const stmts = [
      db.prepare(
        'INSERT INTO game_records (id, room_id, rounds, player_count, created_at) VALUES (?, ?, ?, ?, ?)',
      ).bind(gameId, s.roomId, s.settings.rounds, s.players.size, Math.floor(Date.now() / 1000)),
    ]

    for (const r of rankings) {
      stmts.push(
        db.prepare(
          'INSERT INTO game_scores (id, game_id, user_id, nickname, score, rank, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ).bind(crypto.randomUUID(), gameId, null, r.player.name, r.totalScore, r.rank, Math.floor(Date.now() / 1000)),
      )
    }

    await db.batch(stmts)
  }

  private async syncKvRoomEntry(): Promise<void> {
    const kv = this.env.WORD_KV
    if (!kv) return
    const s = this.state
    if (!s) return

    const key = `room:list:${s.roomId}`

    const connectedCount = this.connectedPlayerCount()
    if (s.status === 'game_end' || connectedCount === 0) {
      await kv.delete(key)
      return
    }

    const displayStatus = s.status === 'waiting' ? 'waiting' : 'playing'

    await kv.put(
      key,
      JSON.stringify({
        roomId: s.roomId,
        status: displayStatus,
        playerCount: connectedCount,
        maxPlayers: s.settings.maxPlayers,
      }),
      { expirationTtl: 3600 },
    )
  }

  // ---- 广播辅助 ----

  private broadcast(msg: object, excludePlayerId?: string): void {
    const data = JSON.stringify(msg)
    const sent = new Set<string>()
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment() as { playerId: string } | null
      if (!att) continue
      if (excludePlayerId && att.playerId === excludePlayerId) continue
      // 同一 playerId 只发一次（防止多连接导致重复）
      if (sent.has(att.playerId)) continue
      sent.add(att.playerId)
      try { ws.send(data) } catch { /* ignore */ }
    }
  }

  private sendToPlayer(playerId: string, msg: object): void {
    const data = JSON.stringify(msg)
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment() as { playerId: string } | null
      if (att?.playerId === playerId) {
        try { ws.send(data) } catch { /* ignore */ }
        return
      }
    }
  }

  private broadcastRoomState(): void {
    this.broadcast({ type: 'room_state', data: this.toRoomState() })
  }
}
