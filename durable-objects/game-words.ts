import wordsData from '../data/words.json'

/** 所有词汇合并为一个数组 */
export const ALL_WORDS: string[] = Object.values(wordsData).flat()

/** Fisher-Yates 原地洗牌（返回同一数组） */
export function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Fisher-Yates 部分洗牌，从词库中随机选 count 个词。
 * 跳过 usedWords 中已使用的词；池子不够时重置。
 */
export function pickRandomWords(count: number, usedWords: Set<string>): string[] {
  const available = ALL_WORDS.filter((w) => !usedWords.has(w))
  const pool = available.length >= count ? available : [...ALL_WORDS]

  const result: string[] = []
  const copy = [...pool]
  for (let i = 0; i < count && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length)
    result.push(copy[idx])
    copy[idx] = copy[copy.length - 1]
    copy.pop()
  }
  return result
}
