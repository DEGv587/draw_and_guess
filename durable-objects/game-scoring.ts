import { GAME_CONSTANTS } from '../shared/constants'
import type { PlayerState, Player, PlayerScore } from '../shared/types'

/** 猜词者得分：基础分 + 时间加权奖励 */
export function calcGuesserScore(elapsed: number, drawTime: number): number {
  const remaining = Math.max(0, drawTime - elapsed)
  const ratio = remaining / drawTime
  return Math.round(GAME_CONSTANTS.BASE_SCORE + ratio * GAME_CONSTANTS.TIME_BONUS_MAX)
}

/** 画手得分：每个猜对者基础分 + 平均时间奖励 */
export function calcDrawerScore(guessedCount: number, avgRatio: number): number {
  return Math.round(
    guessedCount * GAME_CONSTANTS.DRAWER_PER_GUESS_SCORE +
    avgRatio * GAME_CONSTANTS.DRAWER_TIME_BONUS_MAX,
  )
}

/** 从 players Map 构建最终排名 */
export function buildRankings(
  players: Map<string, PlayerState>,
  toPlayer: (p: PlayerState) => Player,
): PlayerScore[] {
  return Array.from(players.values())
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({
      player: toPlayer(p),
      rank: i + 1,
      totalScore: p.score,
    }))
}
