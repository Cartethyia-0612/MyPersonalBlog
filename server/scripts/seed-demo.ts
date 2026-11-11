import { config } from '../src/config'
import { closeDatabase, openDatabase } from '../src/db'
import { createArticle, type ArticleInput } from '../src/services/articles'
import { createFriend, listAllFriends } from '../src/services/friends'
import { createPlaylist, listAllPlaylists } from '../src/services/music'
import { countUsers } from '../src/services/users'

interface DemoArticle extends ArticleInput {
  slug: string
}

const demoArticles: DemoArticle[] = [
  {
    title: '用 Vue 3 搭一个天依蓝主题的博客',
    slug: 'vue3-tianyi-blue-blog',
    summary: '从设计令牌、主题切换和路由动效开始，把个人博客做成一个真正属于自己的界面。',
    contentMd: `# 从一块蓝色开始

个人博客最迷人的地方，不是它用了什么框架，而是它终于可以被做成**自己想要的样子**。

这个站点把 \`#66CCFF\` 作为主色，配合深空背景、网格与六边形图案，形成一种克制的极客感。

## 主题切换的三个状态

浅色、深色、跟随系统。真正容易被忽略的是首屏闪白：主题需要在 Vue 挂载前就写入 \`data-theme\`。

\`\`\`html
<script src="/theme-init.js"></script>
\`\`\`

## 下一步

把文章、友链、音乐播放器和后台都接上，让这个蓝色空间真正开始呼吸。`,
    coverUrl: '',
    tags: ['Vue', '前端', '工程实践'],
    status: 'published',
  },
  {
    title: 'SQLite：小站点更克制的数据库选择',
    slug: 'sqlite-for-personal-site',
    summary: '单文件、零运维、备份简单。对个人博客来说，SQLite 往往比一台 PostgreSQL 更合适。',
    contentMd: `# 为什么是 SQLite

个人博客的写入频率很低，读取频率也不高。为这种场景维护一个独立的数据库服务，收益并不明显。

- 部署只需要 Node 和磁盘
- 备份可以是一个原子操作
- 本地开发和生产环境的行为一致

## 关键配置

\`\`\`ts
const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
\`\`\`

> 工具没有绝对的好坏，只有是否匹配当前阶段。`,
    coverUrl: '',
    tags: ['SQLite', '后端', '运维'],
    status: 'published',
  },
  {
    title: '把新文章推给搜索引擎：IndexNow 与百度',
    slug: 'indexnow-and-baidu-push',
    summary: '生成 sitemap 只是第一步。IndexNow 和百度主动推送，能让新内容更快被看见。',
    contentMd: `# 内容写完了，然后呢

除了 \`sitemap.xml\`，还可以主动把 URL 推送给搜索引擎。

## IndexNow

在站点根目录放置验证 Key 文件，然后向 IndexNow 端点提交 URL 列表。

## 百度推送

使用百度搜索资源平台的 Token 提交文章地址，并记录返回的配额与状态。

内容、结构与反馈的长期循环，才是 SEO。`,
    coverUrl: '',
    tags: ['SEO', 'Node.js'],
    status: 'published',
  },
]

function main(): void {
  const db = openDatabase(config.dbPath)
  try {
    console.log(`[seed:demo] database: ${config.dbPath}`)

    let createdArticles = 0
    for (const article of demoArticles) {
      const exists = db.prepare('SELECT id FROM articles WHERE slug = ?').get(article.slug) as
        { id: number } | undefined
      if (exists) continue
      createArticle(db, article)
      createdArticles += 1
    }
    console.log(`[seed:demo] articles created: ${createdArticles}`)

    if (listAllFriends(db).length === 0) {
      createFriend(db, {
        name: '洛天依的调音台',
        url: 'https://example.com/tianyi',
        avatarUrl: '',
        description: '一个关于音乐与代码的幻想站点。',
        sortOrder: 1,
        visible: true,
      })
      createFriend(db, {
        name: '极客小站',
        url: 'https://example.com/geek',
        avatarUrl: '',
        description: '折腾硬件、软件和一切的角落。',
        sortOrder: 2,
        visible: true,
      })
      console.log('[seed:demo] friends created: 2')
    } else {
      console.log('[seed:demo] friends already exist, skipped')
    }

    if (listAllPlaylists(db).length === 0) {
      createPlaylist(db, {
        name: '夜间编码 · 网易云',
        server: 'netease',
        playlistId: '3778678',
        sortOrder: 1,
        visible: true,
      })
      console.log('[seed:demo] playlist created: 1')
    } else {
      console.log('[seed:demo] playlists already exist, skipped')
    }

    if (countUsers(db) === 0) {
      console.log('[seed:demo] no admin account yet. Run `pnpm setup` after this script.')
    }
  } finally {
    closeDatabase(db)
  }
}

main()
