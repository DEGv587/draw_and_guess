const STORAGE_KEY = 'draw_wc_player_id'

export function getOrCreatePlayerId(): string {
  let id = localStorage.getItem(STORAGE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, id)
  }
  return id
}
