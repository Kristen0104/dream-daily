#!/bin/bash
set -e

echo "========================================="
echo "  Dream Daily 一键部署脚本"
echo "========================================="

# 配置变量
VOLC_API_KEY="5f85e5d0-3451-4ccf-bdc2-f5ddc2e530d5"
SERVER_IP="118.145.251.226"

echo ""
echo "[1/6] 更新系统并安装依赖..."
apt update && apt upgrade -y
apt install -y curl git ufw

echo ""
echo "[2/6] 安装 Docker..."
curl -fsSL https://get.docker.com | sh
systemctl start docker
systemctl enable docker

echo ""
echo "[3/6] 安装 Docker Compose..."
apt install -y docker-compose

echo ""
echo "[4/6] 克隆或上传项目..."
cd /root
if [ -d "dream-daily" ]; then
    echo "项目目录已存在，正在备份..."
    mv dream-daily dream-daily.backup.$(date +%Y%m%d_%H%M%S)
fi

# 注意：这里需要你手动上传项目，或者从git克隆
# 如果有git仓库，取消下面这行的注释：
# git clone <你的仓库地址> dream-daily

echo ""
echo "⚠️  请手动上传项目代码到 /root/dream-daily"
echo "   或者按 Ctrl+C 停止，先上传代码后再运行此脚本"
echo ""
read -p "如果已经上传好代码，按 Enter 继续..."

cd /root/dream-daily

echo ""
echo "[5/6] 配置环境变量..."
cat > .env << EOF
VOLC_API_KEY=${VOLC_API_KEY}
NODE_ENV=production
PORT=3000
EOF

echo ""
echo "[6/6] 构建并启动服务..."
docker-compose up -d --build

echo ""
echo "配置防火墙..."
ufw allow 22/tcp
ufw allow 3000/tcp
ufw --force enable

echo ""
echo "========================================="
echo "  部署完成！"
echo "========================================="
echo ""
echo "访问地址：http://${SERVER_IP}:3000"
echo ""
echo "常用命令："
echo "  查看日志：docker-compose logs -f"
echo "  停止服务：docker-compose down"
echo "  重启服务：docker-compose restart"
echo ""
echo "等待服务启动中..."
sleep 10

if docker-compose ps | grep -q "Up"; then
    echo "✅ 服务启动成功！"
    echo "🚀 现在可以访问 http://${SERVER_IP}:3000"
else
    echo "❌ 服务启动可能有问题，请检查日志：docker-compose logs"
fi
