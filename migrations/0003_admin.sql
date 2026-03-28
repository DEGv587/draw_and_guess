-- 添加管理员字段
ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0;

-- 创建管理员账号 deg
INSERT OR IGNORE INTO users (id, username, password_hash, nickname, is_admin)
VALUES (
  'admin-deg-001',
  'deg',
  '60f13da7023248f8c1cd8b80e1345c90:69ce774294079da0a15f44f316464dfc3729dd371df7aee19808d4b6a8c10163',
  'deg',
  1
);
