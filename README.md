# 🎮 GamingHub - 游戏开黑平台

找游戏搭子，开小群，开麦联机。

## 🚀 部署到 Railway（免费，最简单）

### 第一步：上传代码到 GitHub

1. 注册 [GitHub](https://github.com) 账号（没有的话）
2. 新建一个仓库，名字随便取比如 `gaming-hub`
3. 把这个项目的文件全部上传到仓库

### 第二步：部署

1. 打开 [Railway.app](https://railway.app)，用 GitHub 登录
2. 点 **New Project** → **Deploy from GitHub repo**
3. 选你刚上传的仓库
4. Railway 会自动识别 Dockerfile 并开始构建

### 第三步：添加数据库

1. 在 Railway 项目页面点 **+ New** → **Database** → **Add PostgreSQL**
2. 再点 **+ New** → **Database** → **Add Redis**（可选，不加也能跑）
3. 回到你的服务，点 **Variables**，添加：
   - `JWT_SECRET` → 随便打一串密钥，比如 `my-super-secret-key-123`
   - `DATABASE_URL` → 点 PostgreSQL 服务里的 **Connect** → 复制 Internal URL
   - `CLIENT_URL` → `*`

### 第四步：生成域名

1. 点你的服务 → **Settings** → **Networking**
2. 点 **Generate Domain**
3. 会得到一个 `xxx.up.railway.app` 的免费域名

### 第五步：初始化数据库

1. Railway 里点你的服务 → **Settings** → 点右上角终端图标
2. 运行：
```bash
npx prisma db push --skip-generate
npx tsx src/prisma/seed.ts
```

搞定！打开你的域名就能用了 🎉

---

## 💰 费用

Railway 免费额度：
- **$5/月** 的计算额度（小型项目够用）
- **PostgreSQL** 免费 1GB 存储
- 超出后按量计费，个人项目一般几块钱

---

## 🛠️ 本地开发

```bash
# 安装依赖
cd server && npm install
cd ../client && npm install

# 配置
cp .env.example .env

# 初始化数据库
cd ../server
npx prisma db push
npm run db:seed

# 启动后端 (新终端)
npm run dev

# 启动前端
cd ../client
npm run dev

# 访问 http://localhost:5173
```

## 📁 项目结构

```
gaming-hub/
├── client/          # React 前端
│   └── src/
│       ├── pages/        # 页面 (登录/注册/大厅/房间/个人)
│       ├── hooks/        # useWebRTC 语音通话
│       ├── stores/       # Zustand 状态管理
│       └── services/     # API 请求
├── server/          # Node.js 后端
│   └── src/
│       ├── routes/       # REST API
│       ├── sockets/      # Socket.io 聊天 + 语音信令
│       ├── services/     # mediasoup WebRTC SFU
│       └── prisma/       # 数据库
├── Dockerfile       # 一键构建
├── railway.json     # Railway 部署配置
└── README.md
```

## ✨ 功能

- 注册/登录
- 25+ 款游戏库，绑定你常玩的游戏
- 按游戏创建/加入房间
- 实时文字聊天
- WebRTC 语音通话（浏览器直接开麦）
- 在线状态显示

## 🛠️ 技术栈

React + Node.js + Socket.io + WebRTC/mediasoup + Prisma + SQLite/PostgreSQL
