# 快速部署指南 - 火山引擎云服务器

## 1. 本地准备

### 1.1 测试本地 Docker 构建（可选）
```bash
# 在项目根目录
docker-compose build
```

## 2. 上传代码到服务器

### 方式 A：Git（推荐）
```bash
# 在服务器上
cd ~
git clone <你的仓库地址>
cd dream-daily
```

### 方式 B：SCP 上传
```bash
# 在本地电脑执行
scp -r "d:\Dream daily" root@<你的服务器IP>:/root/dream-daily
```

## 3. 服务器上配置

### 3.1 连接服务器
```bash
ssh root@<你的服务器IP>
```

### 3.2 安装 Docker 和 Docker Compose
```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 启动 Docker
systemctl start docker
systemctl enable docker

# 安装 Docker Compose
apt update && apt install -y docker-compose
```

### 3.3 配置环境变量
```bash
cd ~/dream-daily

# 创建 .env 文件
cat > .env << 'EOF'
VOLC_API_KEY=你的火山引擎API_KEY
EOF
```

## 4. 启动服务

```bash
cd ~/dream-daily

# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f
```

服务会在 `http://<你的服务器IP>:3000` 运行

## 5. 配置防火墙

### 开放 3000 端口（火山引擎控制台）
1. 登录火山引擎控制台
2. 进入云服务器 ECS → 安全组
3. 添加入站规则：端口 3000，源 0.0.0.0/0

## 6. 配置域名（可选但推荐）

### 6.1 购买域名
在火山引擎或其他域名注册商购买域名

### 6.2 配置 DNS 解析
添加 A 记录：
- 主机记录：@ 或 www
- 记录值：你的服务器IP

### 6.3 用 Nginx 反向代理 + SSL

在服务器上：
```bash
# 安装 Nginx
apt install -y nginx

# 安装 Certbot
apt install -y certbot python3-certbot-nginx
```

创建 Nginx 配置：
```bash
cat > /etc/nginx/sites-available/dream-daily << 'EOF'
server {
    listen 80;
    server_name 你的域名.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# 启用配置
ln -s /etc/nginx/sites-available/dream-daily /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重载 Nginx
nginx -s reload

# 获取 SSL 证书
certbot --nginx -d 你的域名.com
```

## 7. 常用命令

```bash
# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 更新代码后重新部署
git pull
docker-compose up -d --build

# 备份数据
docker cp dream-daily_dream-daily_1:/app/backend/data/dreams.db ./dreams.backup.db
```

## 完成！

现在分享你的域名给朋友，他们就能直接访问使用了！
