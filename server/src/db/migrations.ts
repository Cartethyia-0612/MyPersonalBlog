export interface Migration {
  version: number
  name: string
  sql: string
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    sql: `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL COLLATE NOCASE UNIQUE,
        password_hash TEXT NOT NULL,
        totp_secret_enc TEXT,
        totp_enabled INTEGER NOT NULL DEFAULT 0 CHECK (totp_enabled IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        csrf_token TEXT NOT NULL,
        user_agent TEXT NOT NULL DEFAULT '',
        ip TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL
      );
      CREATE INDEX idx_sessions_user ON sessions(user_id);
      CREATE INDEX idx_sessions_expires ON sessions(expires_at);

      CREATE TABLE login_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        attempt_key TEXT NOT NULL,
        kind TEXT NOT NULL,
        success INTEGER NOT NULL DEFAULT 0 CHECK (success IN (0, 1)),
        created_at TEXT NOT NULL
      );
      CREATE INDEX idx_login_attempts_key_time ON login_attempts(attempt_key, created_at);

      CREATE TABLE articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        summary TEXT NOT NULL DEFAULT '',
        content_md TEXT NOT NULL DEFAULT '',
        cover_url TEXT NOT NULL DEFAULT '',
        tags_json TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
        published_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX idx_articles_status_published ON articles(status, published_at DESC);

      CREATE TABLE friends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        avatar_url TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        visible INTEGER NOT NULL DEFAULT 1 CHECK (visible IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX idx_friends_sort ON friends(visible, sort_order, id);

      CREATE TABLE music_playlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        server TEXT NOT NULL DEFAULT 'netease',
        playlist_id TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        visible INTEGER NOT NULL DEFAULT 1 CHECK (visible IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX idx_music_playlists_sort ON music_playlists(visible, sort_order, id);

      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE seo_push_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL CHECK (provider IN ('indexnow', 'baidu')),
        url_count INTEGER NOT NULL DEFAULT 0,
        success INTEGER NOT NULL DEFAULT 0 CHECK (success IN (0, 1)),
        status_code INTEGER,
        message TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );
      CREATE INDEX idx_seo_push_logs_created ON seo_push_logs(created_at DESC);

      INSERT OR IGNORE INTO settings (key, value_json, updated_at) VALUES
        ('site', '{"name":"饿师傅的技术札记","tagline":"把灵感写成可复用的代码","description":"记录工程实践、工具折腾与灵感的个人技术博客。","icon":"/favicon.svg","author":"饿师傅","siteUrl":""}', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        ('footer', '{"icp":"","policeIcp":"","policeUrl":"","virtualRecord":"","customText":"","copyright":""}', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        ('about', '{"contentMd":"## 你好，我是饿师傅\\n\\n欢迎来到我的技术札记。这里记录工程实践、工具折腾，以及偶尔闪现的灵感。\\n\\n- 写代码，也写踩坑记录\\n- 喜欢清晰、可维护的解决方案\\n- 天依蓝是本博客的底色\\n\\n> 保持好奇，保持构建。\\n\\n## 关于本站\\n\\n本站使用 Vue 3、Node.js 与 SQLite 构建。没有评论区，只有安静阅读与持续记录。"}', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        ('music', '{"apiBase":"https://api.qijieya.cn/meting/"}', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        ('seo', '{"siteUrl":"","indexNowKey":"","baiduToken":""}', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
    `,
  },
]
