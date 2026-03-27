export const MAX_CHAT_LENGTH = 200
export const MAX_GUESS_LENGTH = 50
export const MAX_DRAW_COORD = 10000
export const RATE_LIMIT_WINDOW_MS = 1000
export const RATE_LIMIT_MAX_MESSAGES = 30

/** 校验客户端消息格式和内容 */
export function validateMessage(msg: Record<string, unknown>): { valid: boolean; reason?: string } {
  if (!msg || typeof msg.type !== 'string') {
    return { valid: false, reason: 'Invalid message format' }
  }

  switch (msg.type) {
    case 'chat':
      if (typeof msg.message !== 'string' || msg.message.length > MAX_CHAT_LENGTH)
        return { valid: false, reason: 'Chat message too long' }
      break
    case 'guess':
      if (typeof msg.word !== 'string' || msg.word.length > MAX_GUESS_LENGTH)
        return { valid: false, reason: 'Guess too long' }
      break
    case 'choose_word':
      if (typeof msg.word !== 'string')
        return { valid: false, reason: 'Invalid word' }
      break
    case 'draw': {
      const d = msg.data as Record<string, unknown> | undefined
      if (!d || typeof d.action !== 'string')
        return { valid: false, reason: 'Invalid draw action' }
      if ((d.action === 'start' || d.action === 'move') &&
          (typeof d.x !== 'number' || typeof d.y !== 'number' ||
           d.x < -100 || d.x > MAX_DRAW_COORD || d.y < -100 || d.y > MAX_DRAW_COORD))
        return { valid: false, reason: 'Draw coords out of range' }
      break
    }
    case 'draw_batch': {
      if (!Array.isArray(msg.data) || msg.data.length === 0 || msg.data.length > 200)
        return { valid: false, reason: 'Invalid draw batch' }
      break
    }
    case 'throw_poop':
      if (typeof msg.targetId !== 'string')
        return { valid: false, reason: 'Invalid target' }
      break
    case 'select_seat':
      if (typeof msg.seatIndex !== 'number' || msg.seatIndex < 0)
        return { valid: false, reason: 'Invalid seat index' }
      break
  }

  return { valid: true }
}

/** 昵称截断 + HTML 特殊字符过滤 */
export function sanitizeName(name: string): string {
  return name.slice(0, 20).replace(/[<>"'&]/g, '')
}

/**
 * 纯函数版速率检查。
 * 返回清理后的时间戳数组和是否允许。
 */
export function checkRateLimit(
  timestamps: number[],
  now: number,
): { allowed: boolean; updated: number[] } {
  // 清除过期时间戳
  const cutoff = now - RATE_LIMIT_WINDOW_MS
  const updated = timestamps.filter((t) => t >= cutoff)

  if (updated.length >= RATE_LIMIT_MAX_MESSAGES) {
    return { allowed: false, updated }
  }

  updated.push(now)
  return { allowed: true, updated }
}
