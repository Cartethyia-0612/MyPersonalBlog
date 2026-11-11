# 部署与运维指南

本文覆盖本地运行、Ubuntu VPS 手动部署、Docker 部署、备份恢复、SEO 上线与故障排查。

> **部署模型前提**：本应用使用 SQLite，适合**单实例**部署。不要把同一个 `data/` 目录挂载给多个 Node 进程或多个容器副本。需要横向扩容时，应先将数据库迁移到 PostgreSQL 等客户端/服务器数据库。

## 0. 快速检查清单

- [ ] Node.js ≥ 22.12（推荐 24 LTS），pnpm ≥ 11
- [ ] `APP_SECRET` ≥ 32 字符且长期保持不变
- [ ] `SITE_URL` 是真实公网 HTTPS 地址（SEO 推送必需）
- [ ] `COOKIE_SECURE=true`、`TRUST_PROXY=1`
- [ ] `data/` 和 `uploads/` 在持久磁盘，权限正确
- [ ] 管理员密码强且未使用示例密码；已开启 TOTP
- [ ] 每日备份数据库 + uploads，并测试过恢复
- [ ] 防火墙只开放 SSH / 80 / 443；Node 端口仅本机监听
- [ ] 已配置域名、HTTPS、sitemap 与 SEO 推送 Key

---

## 1. 本地开发

### 1.1 安装 Node / pnpm

Windows：

```powershell
winget install --id OpenJS.NodeJS.LTS -e
# 重新打开终端
npm install -g pnpm
node -v
pnpm -v
```

Ubuntu / macOS 也可以用 nvm：

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
nvm install 24
npm install -g pnpm
```

### 1.2 初始化

```bash
cd PersonalBlog
pnpm install
cp .env.example .env
# Windows: Copy-Item .env.example .env
```

生成 `APP_SECRET`：

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

本地开发 `.env`：

```dotenv
NODE_ENV=development
PORT=3000
SITE_URL=http://localhost:5173
APP_SECRET=生成的随机串
COOKIE_SECURE=false
TRUST_PROXY=0
```

创建管理员：

```bash
pnpm setup
```

可选演示内容：

```bash
pnpm seed:demo
```

### 1.3 启动与验证

```bash
pnpm dev
```

- 前台 http://localhost:5173
- 后台 http://localhost:5173/admin
- API http://localhost:3000/api/health

本地生产预览：

```bash
pnpm build
pnpm start
# http://localhost:3000
```

> 如果使用生产预览但 `.env` 里 `SITE_URL=http://localhost:5173`，后台写请求的 Origin 校验可能不匹配。直接访问 3000 端口时，把 `SITE_URL` 临时改为 `http://localhost:3000`，或继续使用 Vite 开发服务器。

---

## 2. Ubuntu VPS 手动部署（推荐）

以下以 Ubuntu 24.04、域名 `blog.example.com`、应用用户 `eshi` 为例。

### 2.1 DNS 与基础软件

1. 域名 A 记录指向 VPS 公网 IPv4；如使用 IPv6 也配置 AAAA。
2. 安装 Node.js、Nginx、Git 和 Certbot：

```bash
sudo apt update
sudo apt install -y curl ca-certificates git nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
sudo corepack enable
sudo corepack prepare pnpm@11.28.5 --activate
node -v
pnpm -v
```

> 如果服务器上无法使用 corepack，可执行 `sudo npm install -g pnpm@11.28.5`。

3. 创建应用用户和目录：

```bash
sudo adduser --disabled-password --gecos "" eshi
sudo mkdir -p /opt/eshi-blog /var/lib/eshi-blog/data /var/lib/eshi-blog/uploads
sudo chown -R eshi:eshi /opt/eshi-blog /var/lib/eshi-blog
```

### 2.2 获取代码并安装

```bash
sudo -u eshi -H bash
cd /opt/eshi-blog
git clone <你的仓库地址> .
# 或从本机 rsync：
# rsync -av --exclude node_modules --exclude data --exclude uploads ./ user@server:/opt/eshi-blog/
pnpm install --frozen-lockfile
pnpm build
```

### 2.3 生产环境变量

```bash
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
nano .env
chmod 600 .env
```

示例：

```dotenv
NODE_ENV=production
PORT=3000
SITE_URL=https://blog.example.com
APP_SECRET=把生成的随机串粘贴到这里
COOKIE_SECURE=true
TRUST_PROXY=1
DB_PATH=/var/lib/eshi-blog/data/blog.db
UPLOAD_DIR=/var/lib/eshi-blog/uploads
ALLOWED_ORIGINS=
```

注意：

- `APP_SECRET` 部署后不要更换，否则 TOTP 密钥无法解密。
- `SITE_URL` 必须与浏览器访问的最终 HTTPS 域名完全一致（含 `www` 与否）。
- 如改端口，Nginx 的 `proxy_pass` 也要同步。

### 2.4 初始化管理员

确保当前用户可写 `/var/lib/eshi-blog`：

```bash
sudo chown -R eshi:eshi /var/lib/eshi-blog
pnpm setup
```

或非交互式：

```bash
ADMIN_USERNAME=admin ADMIN_PASSWORD='一个至少10位的强密码' pnpm setup
```

建议立即在后台 `/admin/security` 开启 TOTP。可选：

```bash
pnpm seed:demo
```

### 2.5 systemd 托管

```bash
sudo cp deploy/eshi-blog.service /etc/systemd/system/eshi-blog.service
sudo systemctl daemon-reload
sudo systemctl enable --now eshi-blog
sudo systemctl status eshi-blog
sudo journalctl -u eshi-blog -f
```

验证：

```bash
curl -fsS http://127.0.0.1:3000/api/health
```

如果 Node 不在 `/usr/bin/node`，修改 service 中的 `ExecStart`。服务文件默认以 `eshi` 用户运行，并把可写范围限制在 `/var/lib/eshi-blog`。

### 2.6 Nginx 与 HTTPS

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/eshi-blog
sudo nano /etc/nginx/sites-available/eshi-blog
# 把 server_name 改成你的域名
sudo ln -s /etc/nginx/sites-available/eshi-blog /etc/nginx/sites-enabled/eshi-blog
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d blog.example.com
```

证书自动续期检查：

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

防火墙：

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

验证 HTTPS、后台登录、TOTP、`/sitemap.xml`、`/robots.txt`。

### 2.7 升级

```bash
sudo -u eshi -H bash
cd /opt/eshi-blog
git pull
pnpm install --frozen-lockfile
pnpm build
exit
sudo systemctl restart eshi-blog
curl -fsS https://blog.example.com/api/health
```

升级前先备份。数据库迁移在启动时自动执行。

### 2.8 日志

```bash
sudo journalctl -u eshi-blog -n 200 --no-pager
sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log
```

---

## 3. Docker Compose 部署

当前机器未安装 Docker，以下文件已提供但需在目标机器验证构建。

### 3.1 准备

```bash
cd /opt/eshi-blog
cp .env.example .env
nano .env
```

容器内建议配置：

```dotenv
NODE_ENV=production
SITE_URL=https://blog.example.com
APP_SECRET=...
COOKIE_SECURE=true
DB_PATH=/app/data/blog.db
UPLOAD_DIR=/app/uploads
```

准备持久化目录并交给容器内 `node` 用户（UID 1000）：

```bash
mkdir -p data uploads backups
sudo chown -R 1000:1000 data uploads backups
```

### 3.2 构建、初始化与启动

```bash
docker compose build
docker compose run --rm \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD='至少10位的强密码' \
  blog pnpm setup
docker compose up -d
docker compose ps
docker compose logs -f --tail=100
```

`docker-compose.yml` 只把 3000 端口绑定到 `127.0.0.1`，应继续使用宿主机 Nginx 反向代理：

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Nginx 配置参考 `deploy/nginx.conf`。

### 3.3 升级

```bash
git pull
docker compose build
docker compose up -d
docker compose logs -f --tail=100
```

数据库位于宿主机 `./data/blog.db`，容器重建不会丢失。

### 3.4 备份

```bash
docker compose exec blog pnpm backup
# 备份写入宿主机 ./backups/<时间戳>/
```

### 3.5 本地 HTTP 测试

若暂时没有 Nginx/TLS，本地 Docker 可设置：

```dotenv
SITE_URL=http://localhost:3000
COOKIE_SECURE=false
```

并临时把 compose 的 `TRUST_PROXY` 设为 `"0"`。上线 HTTPS 前务必改回生产值。

---

## 4. PaaS / 容器平台

Railway、Render、Fly.io 等平台可以运行，但必须满足：

- **单实例**，关闭多副本 / 自动扩缩容；
- 挂载**持久磁盘**；
- 将 `DB_PATH` 和 `UPLOAD_DIR` 指向持久磁盘上的目录；
- 注入 `APP_SECRET`、`SITE_URL`、`NODE_ENV=production`、`COOKIE_SECURE=true`、`TRUST_PROXY=1`；
- 不把 SQLite 放在临时文件系统；无状态 serverless 部署不适用；
- 首次启动后通过平台终端执行 `pnpm setup`。

平台重启可能造成短暂停服；个人博客通常可以接受。需要高可用时应迁移数据库并拆分上传存储。

---

## 5. 备份与恢复

### 5.1 备份

应用提供基于 SQLite 在线备份 API 的脚本，无需 `sqlite3` 命令：

```bash
cd /opt/eshi-blog
pnpm backup
```

输出：

```text
backups/2026-11-11T.../blog.db
backups/2026-11-11T.../uploads/
```

crontab 示例（以 `eshi` 用户执行）：

```cron
0 3 * * * cd /opt/eshi-blog && /usr/bin/pnpm backup >> /var/log/eshi-backup.log 2>&1
```

请将备份目录同步到另一台机器或对象存储，例如：

```bash
rsync -av /opt/eshi-blog/backups/ backup-host:/srv/backups/eshi-blog/
```

仅备份数据库不够：文章封面、站点 Icon 等上传文件也要一起备份。

### 5.2 恢复

```bash
sudo systemctl stop eshi-blog
cd /opt/eshi-blog

# 先保留现场
sudo cp /var/lib/eshi-blog/data/blog.db /var/lib/eshi-blog/data/blog.db.before-restore-$(date +%s)

# 恢复备份目录中的文件
sudo cp backups/<时间戳>/blog.db /var/lib/eshi-blog/data/blog.db
sudo rm -rf /var/lib/eshi-blog/uploads
sudo cp -a backups/<时间戳>/uploads /var/lib/eshi-blog/uploads
sudo chown -R eshi:eshi /var/lib/eshi-blog
sudo systemctl start eshi-blog
```

恢复后检查 `curl https://blog.example.com/api/health` 与后台登录。

---

## 6. SEO 上线流程

1. 确认 `SITE_URL` 是真实 HTTPS 域名，且后台「站点设置 → 站点 URL」一致。
2. 访问并检查：
   - `https://blog.example.com/sitemap.xml`
   - `https://blog.example.com/robots.txt`
3. 在 Google Search Console / Bing Webmaster / 百度搜索资源平台提交 sitemap。
4. **IndexNow**
   - 后台「SEO 推送」生成或填写 Key；
   - 保存后访问 `https://blog.example.com/<key>.txt`，应返回 Key 原文；
   - 点击「推送全部 URL」，查看推送历史中的 HTTP 状态与结果。
5. **百度主动推送**
   - 从百度搜索资源平台获取 Token；
   - 填入后台并保存；
   - 推送后检查返回的 success / remain 配额信息。
6. 本地域名（localhost / 私有 IP）会被后端拒绝推送，需先配置公网域名。
7. 发布新文章后再次推送。不要高频重复推送同一批 URL。

SEO 首屏元信息由 Node 在返回 `index.html` 时注入，客户端路由会继续更新 title / canonical / OG；`/admin`、404 页面会带 `noindex`。

---

## 7. 安全清单

- [ ] 使用 HTTPS，`COOKIE_SECURE=true`
- [ ] `APP_SECRET` 随机、≥32 字符、权限 600、不更换
- [ ] 删除或修改任何示例管理员密码，使用唯一强密码
- [ ] 开启 TOTP，并妥善保存验证器 / 恢复方式
- [ ] 不在公网暴露 SQLite 端口（本应用无数据库端口，仅文件）
- [ ] `data/`、`uploads/`、`backups/`、`.env` 权限最小化，不进入 Git
- [ ] Nginx 只代理 3000；Node 端口不直接暴露
- [ ] 定期更新 Node、pnpm、依赖与系统补丁
- [ ] 定期验证备份可恢复
- [ ] 不在仓库写入真实备案号之外的敏感信息
- [ ] 本项目无评论系统；不要通过第三方脚本重新引入评论嵌入

---

## 8. 故障排查

| 现象                       | 排查方向                                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------------------------- |
| 登录/保存返回 403 CSRF     | 检查 `SITE_URL` 与浏览器 Origin 是否一致；反向代理需传 `X-Forwarded-Proto` 并设置 `TRUST_PROXY=1`         |
| 登录后仍然未登录           | HTTPS 下 `COOKIE_SECURE=true`；检查浏览器是否阻止第三方/安全 Cookie；确认没有多个域名混用                 |
| 登录 429                   | 登录失败限流生效，等待 15 分钟或检查数据库 `login_attempts`                                               |
| TOTP 永远验证失败          | 服务器和手机时间需同步；检查 `APP_SECRET` 是否被更换                                                      |
| 数据库 `SQLITE_BUSY`       | 确认只有一个实例在写；不要在容器副本间共享 DB；检查磁盘权限                                               |
| 上传失败                   | 检查 `UPLOAD_DIR` 写权限、反向代理 `client_max_body_size`、图片是否 ≤2MB 且为支持的格式（不允许 SVG）     |
| 播放器封面/音频被 CSP 拦截 | 当前 CSP 允许 `https:` 图片与媒体；HTTP 音频在 HTTPS 页面会被浏览器拦截；可配置自建 Meting API 使用 HTTPS |
| 播放列表失败               | 后台检查 Meting API 地址、歌单是否公开、网络连通性；后台「预览」可先验证                                  |
| sitemap 含 localhost       | 在 `.env` 与后台站点设置中改为真实域名，重启/刷新                                                         |
| 推送按钮禁用               | 域名不是公网地址或未配置 Key/Token                                                                        |
| IndexNow Key 文件 404      | 确认 Key 已保存且访问地址是 `SITE_URL/<key>.txt`；反向代理不能拦截 `.txt`                                 |
| 页面加载后没有内容         | 查看 `/api/health`、Nginx 日志、浏览器控制台；检查前端构建产物是否存在                                    |
| 静态资源 404               | 重新执行 `pnpm build`；确认 `client/dist` 存在且 Node 有读取权限                                          |
| 修改样式后前台未更新       | 重新构建并部署；浏览器强刷；检查 Nginx/缓存策略                                                           |

## 9. 最终验收命令

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm check:no-comments
pnpm build
curl -fsS https://blog.example.com/api/health
curl -fsS https://blog.example.com/robots.txt
curl -fsS https://blog.example.com/sitemap.xml
```
