-- 用户表 (可选登录用户)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nickname TEXT NOT NULL,
  avatar TEXT,
  total_games INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- 游戏记录表
CREATE TABLE IF NOT EXISTS game_records (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  rounds INTEGER NOT NULL,
  player_count INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- 游戏分数表
CREATE TABLE IF NOT EXISTS game_scores (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES game_records(id),
  user_id TEXT REFERENCES users(id),
  nickname TEXT NOT NULL,
  score INTEGER NOT NULL,
  rank INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_game_scores_game_id ON game_scores(game_id);
CREATE INDEX IF NOT EXISTS idx_game_scores_user_id ON game_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_game_records_created_at ON game_records(created_at);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
