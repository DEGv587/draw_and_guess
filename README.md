# Draw WC - 画画厕所

一个厕所主题的多人在线你画我猜游戏，像素风 UI，支持 2-10 人实时对战。

**在线体验**：https://draw.ljhztq.com/

## 功能特性

- **实时画板同步** — WebSocket + 批量绘画消息 + 贝塞尔曲线插值，画面流畅
- **多人房间** — 创建/加入房间，2-10 人同时游戏，支持断线重连
- **智能计分** — 猜得越快分越高，画手得分取决于猜对人数和平均用时
- **词库系统** — 500+ 中文词汇，8 大分类，支持自定义词库
- **屎粑粑系统** — 猜对获得屎粑粑，可以砸其他玩家干扰视线
- **账号系统** — 可选注册登录，记录游戏历史

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19 + TypeScript + Vite + Tailwind CSS |
| 状态管理 | Zustand |
| 后端 | Hono + Cloudflare Workers |
| 实时通信 | WebSocket (Durable Objects) |
| 数据库 | Cloudflare D1 (SQLite) |
| 缓存 | Cloudflare KV |
| 部署 | Cloudflare Workers |

## 项目结构

```
├── src/                    # 前端 React 应用
│   ├── pages/              #   页面（首页、房间、结果）
│   ├── components/         #   组件（画板、聊天、UI）
│   ├── stores/             #   Zustand 状态管理
│   └── hooks/              #   WebSocket、倒计时等 hooks
├── durable-objects/        # 游戏房间 Durable Object
│   ├── GameRoom.ts         #   房间状态机（核心逻辑）
│   ├── game-scoring.ts     #   计分算法
│   ├── game-words.ts       #   词库选词
│   └── game-validation.ts  #   输入校验 & 限流
├── shared/                 # 前后端共享类型和常量
├── migrations/             # D1 数据库迁移
├── data/                   # 词库数据
├── worker.ts               # Hono 后端入口
└── docs/                   # 项目文档
```

## 快速开始

```bash
# 安装依赖
pnpm install

# 本地数据库迁移
pnpm db:migrate:local

# 启动开发服务器
pnpm dev
```

## 部署

详见 [部署指南](docs/deployment.md)。

```bash
# 登录 Cloudflare
npx wrangler login

# 创建 D1 + KV（首次）
npx wrangler d1 create draw-and-guess-db
npx wrangler kv namespace create WORD_KV

# 更新 wrangler.toml 中的 ID，然后：
pnpm db:migrate:remote
pnpm deploy
```

## 游戏流程

1. 创建或加入房间，等待其他玩家
2. 房主点击开始，每轮每位玩家轮流画画
3. 画手从 3 个词中选 1 个，在限定时间内画出来
4. 其他玩家通过聊天框猜词，猜对越快得分越高
5. 所有轮次结束后显示最终排名

## 文档

- [部署指南](docs/deployment.md)
- [后端架构](docs/backend-architecture.md)
- [数据库设计](docs/database-schema.md)
- [WebSocket 协议](docs/websocket-protocol.md)
- [游戏规则](docs/game-rules.md)
- [UI 设计](docs/ui-design.md)

## License

MIT
