import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, '../data/dreams.db'));
db.pragma('journal_mode = WAL');

// 创建表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    last_active_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS dreams (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    original_text TEXT NOT NULL,
    dream_title TEXT NOT NULL,
    core_imagery TEXT,  -- JSON array
    tags TEXT,         -- JSON array
    story TEXT,        -- JSON array
    analysis TEXT,     -- JSON object
    versions TEXT,     -- JSON array
    current_version_id TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS page_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    user_agent TEXT,
    ip TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_dreams_user_id ON dreams(user_id);
  CREATE INDEX IF NOT EXISTS idx_dreams_created_at ON dreams(created_at);
  CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);
`);

// 用户操作
export function createUser(userId) {
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO users (id, created_at, last_active_at)
    VALUES (?, ?, ?)
  `);
  stmt.run(userId, now, now);
  return getUser(userId);
}

export function getUser(userId) {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(userId);
}

export function updateUserLastActive(userId) {
  const stmt = db.prepare('UPDATE users SET last_active_at = ? WHERE id = ?');
  stmt.run(Date.now(), userId);
}

// 访问统计
export function recordPageView(path, userAgent, ip) {
  const stmt = db.prepare(`
    INSERT INTO page_views (path, user_agent, ip, created_at)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(path, userAgent, ip, Date.now());
}

export function getStats() {
  // 总访问量
  const totalViews = db.prepare('SELECT COUNT(*) as count FROM page_views').get().count;

  // 今日访问量
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayViews = db.prepare('SELECT COUNT(*) as count FROM page_views WHERE created_at >= ?').get(today.getTime()).count;

  // 独立用户数
  const uniqueUsers = db.prepare('SELECT COUNT(DISTINCT id) as count FROM users').get().count;

  // 梦境总数
  const totalDreams = db.prepare('SELECT COUNT(*) as count FROM dreams').get().count;

  return {
    totalViews,
    todayViews,
    uniqueUsers,
    totalDreams
  };
}

// 梦境操作
export function createDream(dream) {
  const stmt = db.prepare(`
    INSERT INTO dreams (
      id, user_id, created_at, original_text, dream_title,
      core_imagery, tags, story, analysis, versions, current_version_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    dream.id,
    dream.userId,
    dream.createdAt,
    dream.originalText,
    dream.dreamTitle,
    JSON.stringify(dream.coreImagery || dream.tags || []),
    JSON.stringify(dream.tags || dream.coreImagery || []),
    JSON.stringify(dream.story),
    dream.analysis ? JSON.stringify(dream.analysis) : null,
    dream.versions ? JSON.stringify(dream.versions) : null,
    dream.currentVersionId || null
  );
  return getDream(dream.userId, dream.id);
}

export function updateDream(dream) {
  const stmt = db.prepare(`
    UPDATE dreams SET
      original_text = ?,
      dream_title = ?,
      core_imagery = ?,
      tags = ?,
      story = ?,
      analysis = ?,
      versions = ?,
      current_version_id = ?
    WHERE id = ? AND user_id = ?
  `);
  stmt.run(
    dream.originalText,
    dream.dreamTitle,
    JSON.stringify(dream.coreImagery || dream.tags || []),
    JSON.stringify(dream.tags || dream.coreImagery || []),
    JSON.stringify(dream.story),
    dream.analysis ? JSON.stringify(dream.analysis) : null,
    dream.versions ? JSON.stringify(dream.versions) : null,
    dream.currentVersionId || null,
    dream.id,
    dream.userId
  );
  return getDream(dream.userId, dream.id);
}

export function getDream(userId, dreamId) {
  const stmt = db.prepare('SELECT * FROM dreams WHERE id = ? AND user_id = ?');
  const row = stmt.get(dreamId, userId);
  if (!row) return null;
  return rowToDream(row);
}

export function getDreams(userId) {
  const stmt = db.prepare('SELECT * FROM dreams WHERE user_id = ? ORDER BY created_at DESC');
  const rows = stmt.all(userId);
  return rows.map(rowToDream);
}

function rowToDream(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    originalText: row.original_text,
    dreamTitle: row.dream_title,
    coreImagery: row.core_imagery ? JSON.parse(row.core_imagery) : [],
    tags: row.tags ? JSON.parse(row.tags) : [],
    story: row.story ? JSON.parse(row.story) : [],
    analysis: row.analysis ? JSON.parse(row.analysis) : undefined,
    versions: row.versions ? JSON.parse(row.versions) : undefined,
    currentVersionId: row.current_version_id
  };
}

export default db;
