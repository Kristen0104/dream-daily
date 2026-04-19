# Dream Daily 部署指南

## 架构说明

- **前端**: React + Vite
- **后端**: Node.js + Express
- **数据库**: SQLite (轻量、无需额外配置)
- **部署**: Docker + Docker Compose

## 本地开发测试

### 1. 启动后端
```bash
cd backend
npm install
mkdir -p data
npm run dev
```

后端会在 http://localhost:3001 启动

### 2. 启动前端 (新终端)
```bash
# 在项目根目录
npm install
cp .env.example .env
# 编辑 .env 设置 VITE_ENABLE_API=true
npm run dev
```

前端会在 http://localhost:3000 启动，API 请求会代理到后端

## 云服务器部署

### 方式一：Docker Compose (推荐)

#### 1. 准备服务器
- 购买云服务器 (阿里云/腾讯云/AWS，最低配置 1核2G即可)
- 安装 Docker 和 Docker Compose
- 开放服务器防火墙端口 3000

#### 2. 上传代码
```bash
# 在服务器上
git clone <你的仓库地址>
cd dream-daily
```

或者用 scp 上传本地文件

#### 3. 构建并启动
```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

服务会在 http://<服务器IP>:3000 运行

#### 4. 数据持久化
SQLite 数据库存储在 Docker volume `dream-data` 中，数据不会因容器重启丢失

### 方式二：手动部署

#### 1. 构建前端
```bash
npm run build
```

#### 2. 安装后端依赖
```bash
cd backend
npm install --production
mkdir -p data
```

#### 3. 启动服务
```bash
cd backend
NODE_ENV=production PORT=3000 node src/server.js
```

建议用 PM2 管理进程:
```bash
npm install -g pm2
pm2 start src/server.js --name dream-daily
```

## 域名 + HTTPS

### 使用 Nginx 反向代理

创建 `/etc/nginx/sites-available/dream-daily`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置:
```bash
ln -s /etc/nginx/sites-available/dream-daily /etc/nginx/sites-enabled/
nginx -t
nginx -s reload
```

### 配置 SSL (Let's Encrypt)
```bash
certbot --nginx -d your-domain.com
```

## 环境变量说明

### 前端 (.env)
```env
VITE_ENABLE_API=true      # 启用后端API，false 则只用 localStorage
VITE_API_URL=/api         # API 基础路径
VITE_VOLC_API_KEY=...     # 火山引擎 API Key
```

### 后端
```env
PORT=3000                 # 服务端口
NODE_ENV=production       # 生产环境
```

## 数据备份

### 备份 SQLite 数据库
```bash
# Docker 方式
docker cp dream-daily_dream-daily_1:/app/backend/data/dreams.db ./backup/

# 手动方式
cp backend/data/dreams.db ./backup/
```

## 注意事项

1. **API Key 安全**: 如果在生产环境使用火山引擎，建议把 API 调用移到后端代理，避免前端暴露 Key
2. **用户认证**: 当前实现用简单的用户 ID，生产环境建议接入 OAuth/手机号登录
3. **数据库**: SQLite 适合中小规模用户，如需更大规模可迁移到 PostgreSQL
4. **图片存储**: 当前图片 URL 是远程的，生产环境建议用对象存储 (OSS/S3)
