/** PBKDF2 密码哈希（Workers 兼容，无需 bcrypt） */

const ITERATIONS = 100_000
const KEY_LENGTH = 32
const ALGORITHM = 'PBKDF2'

function arrayBufferToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes.buffer
}

async function deriveKey(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), ALGORITHM, false, ['deriveBits'])
  return crypto.subtle.deriveBits(
    { name: ALGORITHM, salt: salt as unknown as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    KEY_LENGTH * 8,
  )
}

/** 常数时间比较两个等长字符串 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const derived = await deriveKey(password, salt)
  return `${arrayBufferToHex(salt.buffer)}:${arrayBufferToHex(derived)}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false

  const salt = new Uint8Array(hexToArrayBuffer(saltHex))
  const derived = await deriveKey(password, salt)
  return timingSafeEqual(arrayBufferToHex(derived), hashHex)
}
