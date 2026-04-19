# 服务器部署操作指南

## 第一步：连接到服务器

在你的电脑上打开 **PowerShell** 或 **命令提示符** (CMD)，输入：

```bash
ssh root@118.145.251.226
```

然后输入密码：`Qwertyuiop0104!`

## 第二步：上传项目代码

连接到服务器后，先退出 SSH（输入 `exit`），然后在本地电脑的 PowerShell 中运行：

```bash
cd "d:\Dream daily"
scp -r . root@118.145.251.226:/root/dream-daily
```

（这会把整个项目上传到服务器）

## 第三步：在服务器上运行部署

再次 SSH 连接到服务器：

```bash
ssh root@118.145.251.226
```

然后运行：

```bash
cd /root/dream-daily

# 1. 安装 Docker
curl -fsSL https://get.docker.com | sh
systemctl start docker
systemctl enable docker

# 2. 安装 Docker Compose
apt update && apt install -y docker-compose

# 3. 配置环境变量
cat > .env << 'EOF'
VOLC_API_KEY=5f85e5d0-3451-4ccf-bdc2-f5ddc2e530d5
NODE_ENV=production
PORT=3000
EOF

# 4. 构建并启动
docker-compose up -d --build

# 5. 配置防火墙
ufw allow 22/tcp
ufw allow 3000/tcp
ufw --force enable

# 6. 查看日志
docker-compose logs -f
```

## 完成！

部署成功后，访问：**http://118.145.251.226:3000**

---

## 常用命令

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 停止服务
docker-compose down
```
