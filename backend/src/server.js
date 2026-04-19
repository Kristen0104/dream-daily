import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  createUser,
  getUser,
  updateUserLastActive,
  createDream,
  updateDream,
  getDream,
  getDreams,
  recordPageView,
  getStats
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 访问统计中间件
app.use((req, res, next) => {
  // 只记录页面访问，不记录 API 调用
  if (!req.path.startsWith('/api/')) {
    const userAgent = req.get('User-Agent') || '';
    const ip = req.ip || req.connection.remoteAddress || '';
    recordPageView(req.path, userAgent, ip);
  }
  next();
});

// 火山引擎 API 配置
const VOLC_API_KEY = process.env.VOLC_API_KEY || '';

if (VOLC_API_KEY) {
  console.log('VolcEngine proxy enabled');
} else {
  console.warn('VOLC_API_KEY not set - VolcEngine proxy disabled');
}

// 直接转发聊天 API
app.post('/api/coding/v1/chat/completions', async (req, res) => {
  if (!VOLC_API_KEY) {
    return res.status(500).json({ error: 'API Key not configured' });
  }

  try {
    const response = await fetch('https://ark.cn-beijing.volces.com/api/coding/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VOLC_API_KEY}`
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 直接转发图片生成 API
app.post('/api/images/images/generations', async (req, res) => {
  if (!VOLC_API_KEY) {
    return res.status(500).json({ error: 'API Key not configured' });
  }

  try {
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VOLC_API_KEY}`
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Image API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 简单的用户识别 - 使用 cookie 或 header
function getUserId(req) {
  // 优先从 header 获取，否则生成一个临时 ID
  let userId = req.headers['x-user-id'];
  if (!userId) {
    // 生成临时 ID（生产环境应该用 proper auth）
    userId = 'guest-' + Math.random().toString(36).substr(2, 9);
  }
  return userId;
}

// 用户中间件
app.use((req, res, next) => {
  const userId = getUserId(req);
  req.userId = userId;
  // 确保用户存在
  createUser(userId);
  updateUserLastActive(userId);
  next();
});

// === API Routes ===

// 获取当前用户信息
app.get('/api/user', (req, res) => {
  const user = getUser(req.userId);
  res.json({ userId: user.id, createdAt: user.created_at });
});

// 获取访问统计（密码保护）
app.get('/api/stats', (req, res) => {
  // 需要在 URL 后面加 ?key=dreamdaily123 才能访问
  const accessKey = req.query.key;
  if (accessKey !== 'dreamdaily123') {
    return res.status(403).json({ error: 'Access denied' });
  }
  const stats = getStats();
  res.json(stats);
});

// 获取所有梦境
app.get('/api/dreams', (req, res) => {
  const dreams = getDreams(req.userId);
  res.json(dreams);
});

// 获取单个梦境
app.get('/api/dreams/:id', (req, res) => {
  const dream = getDream(req.userId, req.params.id);
  if (!dream) {
    return res.status(404).json({ error: 'Dream not found' });
  }
  res.json(dream);
});

// 创建梦境
app.post('/api/dreams', (req, res) => {
  const dream = {
    ...req.body,
    userId: req.userId
  };
  const created = createDream(dream);
  res.status(201).json(created);
});

// 更新梦境
app.put('/api/dreams/:id', (req, res) => {
  const existing = getDream(req.userId, req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Dream not found' });
  }
  const dream = {
    ...req.body,
    id: req.params.id,
    userId: req.userId
  };
  const updated = updateDream(dream);
  res.json(updated);
});

// 静态文件服务 - 前端构建产物
app.use(express.static(join(__dirname, '../../dist')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../../dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Dream Daily server running on http://0.0.0.0:${PORT}`);
});
