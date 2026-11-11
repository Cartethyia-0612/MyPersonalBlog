# 饿师傅的技术札记

一个带有天依蓝视觉与极客气质的全栈个人博客。

**Vue 3 + Node.js + TypeScript + SQLite**，自研双主题设计系统，包含完整后台、Meting 音乐播放器、sitemap 与搜索引擎主动推送。

> 本项目**不包含任何评论功能或评论接口**：没有评论表、评论路由、评论组件或第三方评论嵌入。

## 功能

### 前台

- 首页、文章归档、文章详情、友链、关于页，顶部标签切换
- `#66CCFF` 天依蓝 + 深空网格 + 六边形 / 声波 / 终端等原创极客视觉
- 浅色 / 深色 / 跟随系统三模式，首屏前置应用并本地记忆
- 首次进入加载界面、路由顶部进度条、页面过渡；尊重 `prefers-reduced-motion`
- 阅读进度圆环「返回顶部」按钮：页面位于顶部时自动隐藏，滚离顶部后显示滚动百分比；桌面端悬停 / 键盘聚焦时切换为向上箭头，触摸设备常显箭头
- 文章 Markdown 渲染、代码高亮、标签筛选、分页、阅读时长
- 响应式布局与可访问性细节
- 页脚预留 ICP 备案、公安备案、虚拟备案（如萌备）、自定义文本与版权文案
- 音乐播放器：Meting 代理、多固定歌单、播放/暂停、上一首/下一首、列表循环/单曲循环/随机、进度、音量、歌单切换；支持向下箭头隐藏，并在左下角保留悬浮恢复按钮（显示当前曲目封面，失败回退音符图标；隐藏时音乐继续）；移动端音量以按钮展开浮层调节，滑条限制在浮层内并水平居中
- 服务端对公开页首屏注入 title / description / canonical / Open Graph / article meta

### 后台（`/admin`）

- 密码登录 + 可选 TOTP 两步验证
- 仪表盘、文章管理 / Markdown 编辑器 / 草稿与发布
- 关于页编辑、友链管理、站点 Icon 上传
- 全局设置：站点身份、站点 URL、站点 Icon、作者、页脚备案
- 音乐管理：Meting API 地址、固定歌单 CRUD、曲目预览
- SEO 管理：sitemap 状态、IndexNow Key、百度 Token、推送状态与历史
- 安全设置：修改密码、TOTP 启停；修改密码时吊销其他设备的会话
- 后台同样支持浅色 / 深色 / 跟随系统

### 安全与合规

- 后台密码 bcrypt 哈希存储（cost 12）
- 双提交 CSRF Token + Origin / Fetch Metadata 校验，覆盖登录及全部写接口（登录前使用匿名双提交 token）
- 基于 SQLite 的登录失败限流与 TOTP 失败限流
- 会话令牌仅以 SHA-256 哈希入库，HttpOnly + SameSite=Strict + 生产 Secure
- TOTP 密钥使用 AES-256-GCM 加密后入库
- Helmet 安全响应头与自定义 CSP；CSP 允许 HTTPS 音乐封面与媒体
- Markdown DOMPurify 清洗；上传按 magic number 校验，拒绝 SVG
- 全部 SQL 参数化；密码与 TOTP 密钥不写入日志，TOTP 明文仅在绑定流程一次性返回；IndexNow Key 是公开验证文件
- 无评论能力，并提供数据库、路由、源码三级自动守卫

## 技术栈

| 层     | 选型                                             |
| ------ | ------------------------------------------------ |
| 前端   | Vue 3、TypeScript、Vite、Vue Router、Pinia       |
| 后端   | Node.js、Express 5、TypeScript                   |
| 数据库 | SQLite（better-sqlite3）+ 版本化迁移             |
| 认证   | bcryptjs、SQLite Session、CSRF、TOTP、登录限流   |
| 内容   | Markdown-it + highlight.js + DOMPurify           |
| 测试   | Vitest、Supertest、Vue Test Utils                |
| 部署   | 单实例 Node + systemd / Nginx，或 Docker Compose |

## 快速开始

### 1. 环境

- Node.js **>= 22.12**（推荐 24 LTS）
- pnpm **>= 11**
- Git

Windows 安装示例：

```powershell
winget install --id OpenJS.NodeJS.LTS -e
# 重开终端
npm install -g pnpm
node -v
pnpm -v
```

### 2. 安装与初始化

```bash
pnpm install
cp .env.example .env
# Windows: Copy-Item .env.example .env
```

生成并填入 `APP_SECRET`（必填）：

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

编辑 `.env`，至少设置 `APP_SECRET`、`SITE_URL`。本地开发建议：

```dotenv
NODE_ENV=development
PORT=3000
HOST=127.0.0.1
SITE_URL=http://localhost:5173
APP_SECRET=替换成刚刚生成的随机串
COOKIE_SECURE=false
TRUST_PROXY=0
```

初始化管理员（交互式，不提供默认密码）：

```bash
pnpm setup
```

也可以使用环境变量非交互初始化（请先把唯一强密码存入密码管理器，不要写进命令历史或仓库）：

```bash
read -rsp '管理员密码（至少 10 位）: ' ADMIN_PASSWORD; echo
ADMIN_USERNAME=admin ADMIN_PASSWORD="$ADMIN_PASSWORD" pnpm setup
unset ADMIN_PASSWORD
```

> 推荐的交互式方式 `pnpm setup` 会隐藏密码输入；任何情况下都不要使用文档示例或可猜测的密码。

### 3. 启动

```bash
pnpm dev
```

- 前台：http://localhost:5173
- 后台：http://localhost:5173/admin
- API：http://localhost:3000

可选演示内容（可随时在后台删除）：

```bash
pnpm seed:demo
```

### 4. 本地构建预览

```bash
pnpm build
pnpm start
# 默认 development 配置下访问 http://localhost:3000
```

`pnpm start` 只负责运行已构建产物，不会注入 `NODE_ENV`；实际模式由 `.env` 决定。默认 `.env` 适合本地预览，不等同于生产配置。

如果要模拟生产环境，请先把 `.env` 改为：

```dotenv
NODE_ENV=production
SITE_URL=http://localhost:3000
COOKIE_SECURE=false
HOST=127.0.0.1
```

否则生产模式的 Origin 与 Secure Cookie 策略可能使后台写请求失败。真实 HTTPS 部署请按 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) 设置。

## 环境变量

| 变量                                | 必填     | 说明                                                                                         |
| ----------------------------------- | -------- | -------------------------------------------------------------------------------------------- |
| `APP_SECRET`                        | 是       | ≥32 字符，用于会话挑战签名与 TOTP 密钥加密；部署后不要更换，否则 TOTP 无法解密               |
| `SITE_URL`                          | 生产必填 | 站点公开地址，无末尾斜杠；SEO、canonical、CSRF Origin 使用；开发默认 `http://localhost:5173` |
| `HOST`                              | 否       | 监听地址，默认 `127.0.0.1`；本地/VPS 反向代理模式保持默认，容器/PaaS 设为 `0.0.0.0`          |
| `PORT`                              | 否       | Node 端口，默认 3000；Vite 开发代理会读取同一值                                              |
| `NODE_ENV`                          | 否       | development / production                                                                     |
| `COOKIE_SECURE`                     | 否       | HTTPS 生产环境设为 true；本地 HTTP 设为 false                                                |
| `TRUST_PROXY`                       | 否       | 在 Nginx 等反向代理后设为 1；影响客户端 IP 与限流，不参与 CSRF Origin 判断                   |
| `DB_PATH`                           | 否       | SQLite 路径，默认 `data/blog.db`                                                             |
| `UPLOAD_DIR`                        | 否       | 上传目录，默认 `uploads/`                                                                    |
| `ALLOWED_ORIGINS`                   | 否       | 额外允许的写请求 Origin，逗号分隔；`SITE_URL` 始终允许                                       |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | 否       | 仅用于非交互式 `pnpm setup`，不要写入仓库                                                    |

> `.env`、`data/`、`uploads/`、`backups/` 均已被 Git 忽略，不会进入仓库。

## 常用命令

| 命令                                | 说明                                                          |
| ----------------------------------- | ------------------------------------------------------------- |
| `pnpm dev`                          | 同时启动 Express 与 Vite 开发服务器                           |
| `pnpm build`                        | 构建前端静态文件与后端 JS                                     |
| `pnpm start`                        | 运行已构建应用，使用 `.env` 中的 NODE_ENV（默认本地开发配置） |
| `pnpm typecheck`                    | 前后端 TypeScript 检查                                        |
| `pnpm test`                         | 全部前后端测试                                                |
| `pnpm lint`                         | ESLint                                                        |
| `pnpm format` / `pnpm format:check` | Prettier                                                      |
| `pnpm setup`                        | 创建管理员（交互式）                                          |
| `pnpm seed:demo`                    | 写入可删除的演示文章 / 友链 / 歌单                            |
| `pnpm backup`                       | 使用 SQLite 在线备份 API 备份数据库和上传文件                 |
| `pnpm check:no-comments`            | 无评论功能自动守卫                                            |
| `pnpm --filter @eshi/server start`  | 启动已构建的完整应用（需先 build，含 SPA/SEO）                |

## 目录结构

```text
client/                  Vue 3 前台 + 后台
  src/
    views/               前台页面与后台页面（views/admin）
    components/          公共组件、后台组件、播放器
    layouts/             PublicLayout / AdminLayout
    stores/              site / theme / player / auth / toast
    lib/                 API、Markdown、SEO、CSRF、进度条
    styles/              设计令牌、基础样式、Markdown、后台样式
server/                  Express API
  src/
    db/                  SQLite 连接 + 迁移
    middleware/          session、CSRF、auth
    services/            内容、设置、TOTP、Meting、SEO、上传
    routes/              public / auth / admin / seo
  scripts/               setup、seed-demo、backup
  tests/                 Supertest + Vitest
docs/DEPLOYMENT.md       本地与云端部署指南
deploy/                  systemd、Nginx 示例
Dockerfile               Docker 构建
docker-compose.yml       Docker Compose 单实例部署
```

## API 概览

公开接口：

- `GET /api/site`、`GET /api/articles`、`GET /api/articles/:slug`
- `GET /api/friends`、`GET /api/about`
- `GET /api/music/playlists`、`GET /api/music/playlists/:id`
- `GET /sitemap.xml`、`GET /robots.txt`、`GET /<indexnow-key>.txt`
- `GET /api/health`

认证与后台接口：

- `GET /api/auth/session`、`POST /api/auth/login`、`POST /api/auth/login/totp`、`POST /api/auth/logout`
- `/api/admin/articles`、`/api/admin/friends`、`/api/admin/about`、`/api/admin/settings`
- `/api/admin/music/playlists`、`/api/admin/seo`、`/api/admin/security`
- `/api/admin/uploads`

登录后的写接口要求会话绑定的 CSRF Token；登录接口使用匿名双提交 token，调用前需先 `GET /api/auth/session` 获取。后台接口要求有效登录会话。

## 部署

完整步骤见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)，包含：

- 本地开发与构建预览
- Ubuntu VPS + systemd + Nginx + Certbot
- Docker Compose
- SQLite 备份 / 恢复
- SEO 域名、sitemap、IndexNow、百度推送配置
- 安全清单与故障排查

> SQLite 适合单实例部署。不要用多副本 / serverless 实例同时写同一个数据库文件。

## 设计说明

视觉以 `#66CCFF` 天依蓝为核心，使用原创 SVG、CSS 网格、声波与六边形图案；不包含受版权限制的角色立绘。字体使用系统无衬线字体与等宽字体栈，不依赖外部 CDN。
