# 部署指南

本项目部署在 Cloudflare Workers 上，使用 D1 数据库、KV 存储和 Durable Objects。

## 前置条件

- Node.js >= 18
- pnpm >= 10
- Cloudflare 账号
- Wrangler CLI (`pnpm add -g wrangler` 或使用 `npx wrangler`)

## 一、登录 Cloudflare

```bash
npx wrangler login
```

浏览器会打开授权页面，确认授权后终端会显示登录成功。

## 二、创建云端资源

### 1. 创建 D1 数据库

```bash
npx wrangler d1 create draw-and-guess-db
```

记录输出中的 `database_id`。

### 2. 创建 KV 命名空间

```bash
npx wrangler kv namespace create WORD_KV
```

记录输出中的 `id`。

### 3. 更新 wrangler.toml

将上面获取的 ID 填入 `wrangler.toml`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "draw-and-guess-db"
database_id = "<你的 database_id>"

[[kv_namespaces]]
binding = "WORD_KV"
id = "<你的 KV namespace id>"
```

> **注意**：Durable Objects 的 migration 必须使用 `new_sqlite_classes`（非 `new_classes`），这是 Cloudflare 免费计划的要求。

## 三、执行数据库迁移

```bash
pnpm db:migrate:remote
```

这会在远程 D1 上创建 `users`、`sessions`、`game_records`、`game_scores` 表。

## 四、构建并部署

```bash
pnpm run build && npx wrangler deploy
```

或使用封装好的脚本：

```bash
pnpm deploy
```

部署成功后会输出默认的 Workers 地址：

```
https://draw-and-guess.<你的子域名>.workers.dev
```

## 五、绑定自定义域名（推荐）

`workers.dev` 域名在国内无法直接访问，建议绑定自定义域名。

### 1. 准备域名

在 Cloudflare 购买域名，或将已有域名的 NS 记录指向 Cloudflare（DNS 托管在 Cloudflare 上）。

### 2. 绑定到 Worker

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages** → 点击 **draw-and-guess**
3. 进入 **Settings** → **Domains & Routes**
4. 点击 **Add** → 选择 **Custom domain**
5. 输入你的域名（如 `game.example.com` 或 `example.com`）
6. Cloudflare 会自动配置 DNS 记录并签发 SSL 证书

等待 1-2 分钟证书生效，即可通过自定义域名访问。

## 六、后续更新部署

代码修改后，只需：

```bash
pnpm deploy
```

如果修改了数据库结构，需要先执行迁移：

```bash
pnpm db:migrate:remote
```

## 本地开发

```bash
pnpm install     # 安装依赖
pnpm db:migrate:local  # 本地 D1 迁移
pnpm dev         # 启动 Vite 开发服务器（前端热更新）
pnpm preview     # 启动 Wrangler 本地预览（完整后端环境）
```

## 项目资源绑定一览

| 资源 | 绑定名 | 用途 |
|------|--------|------|
| D1 数据库 | `DB` | 用户账号、游戏记录 |
| KV 命名空间 | `WORD_KV` | 房间列表元数据、词库缓存 |
| Durable Object | `GAME_ROOM` | 游戏房间状态管理 |
