#!/bin/bash
set -e

echo "🎮 GamingHub 开发环境设置"
echo "========================="

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 请先安装 Node.js 20+"
    echo "   下载: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js 版本需要 20+，当前: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v)"

# Install server dependencies
echo ""
echo "📦 安装后端依赖..."
cd server
npm install
cd ..

# Install client dependencies
echo ""
echo "📦 安装前端依赖..."
cd client
npm install
cd ..

# Setup .env
if [ ! -f .env ]; then
    cp .env.example .env
    echo ""
    echo "⚠️  已创建 .env 文件，请编辑填入正确的数据库连接信息"
    echo "   文件位置: $(pwd)/.env"
fi

echo ""
echo "✅ 依赖安装完成！"
echo ""
echo "下一步："
echo "  1. 确保 PostgreSQL 和 Redis 已运行"
echo "  2. 编辑 .env 文件配置数据库连接"
echo "  3. 运行: cd server && npx prisma db push && npm run db:seed"
echo "  4. 启动后端: cd server && npm run dev"
echo "  5. 启动前端: cd client && npm run dev"
echo "  6. 访问: http://localhost:5173"
echo ""
echo "或者使用 Docker 一键启动: docker-compose up -d"
