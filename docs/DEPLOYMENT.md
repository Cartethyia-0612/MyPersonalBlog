# 部署与运维指南

本文覆盖本地运行、Ubuntu VPS 手动部署、Docker 部署、备份恢复、SEO 上线与故障排查。

> **部署模型前提**：本应用使用 SQLite，适合**单实例**部署。不要把同一个 `data/` 目录挂载给多个 Node 进程或多个容器副本。需要横向扩容时，应先将数据库迁移到 PostgreSQL 等客户端/服务器数据库。

## 0. 快速检查清单

- [ ] Node.js ≥ 22.12（推荐 24 LTS），pnpm ≥ 11
- [ ] `APP_SECRET` ≥ 32 字符且长期保持不变；已与备份分开安全保存
- [ ] `SITE_URL` 是真实公网 HTTPS 地址（SEO 推送必需）
- [ ] `HOST=127.0.0.1`，Node 端口只监听本机
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
HOST=127.0.0.1
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

本地构建预览：

```bash
pnpm build
pnpm start
# http://localhost:3000
```

> `pnpm start` 只运行已构建产物，使用 `.env` 中的 `NODE_ENV`；默认本地 `.env` 是 development，所以这是本地构建预览，不是生产模式。若要模拟生产：先设置 `NODE_ENV=production`、`SITE_URL=http://localhost:3000`、`COOKIE_SECURE=false`、`HOST=127.0.0.1`，重新启动，否则生产模式的 Origin / Cookie 策略可能使写请求失败。真实 HTTPS 部署见第 2、3 节。

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
sudo npm install -g pnpm@11.28.5
node -v
pnpm -v
```

> 如使用其他方式安装 Node，请确保 npm 可用；也可以使用系统包管理器安装 pnpm，但要保持版本 ≥11。

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
# 或从本机 rsync（不要覆盖服务器 .env / 数据）：
# rsync -av --exclude node_modules --exclude data --exclude uploads --exclude backups --exclude .git --exclude .env --exclude .pnpm-store ./ user@server:/opt/eshi-blog/
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
HOST=127.0.0.1
SITE_URL=https://blog.example.com
APP_SECRET=把生成的随机串粘贴到这里
COOKIE_SECURE=true
TRUST_PROXY=1
DB_PATH=/var/lib/eshi-blog/data/blog.db
UPLOAD_DIR=/var/lib/eshi-blog/uploads
ALLOWED_ORIGINS=
```

注意：

- `HOST=127.0.0.1` 让 Node 只监听本机回环地址，公网请求必须经过 Nginx；不要在手动部署中改成 `0.0.0.0`。
- `APP_SECRET` 部署后不要更换，否则 TOTP 密钥无法解密。
- `SITE_URL` 必须与浏览器访问的最终 HTTPS 域名完全一致（含 `www` 与否）。
- 如改端口，Nginx 的 `proxy_pass` 也要同步。

### 2.4 初始化管理员

目录在 2.1 已归属 `eshi`，直接初始化；如果权限异常，先退出当前 shell（`exit`），由管理员执行 `sudo chown -R eshi:eshi /var/lib/eshi-blog`，再重新进入 `sudo -u eshi -H bash`。

```bash
pnpm setup

# 非交互式（密码先在密码管理器生成，避免写入历史/仓库）：
read -rsp '管理员密码（至少 10 位）: ' ADMIN_PASSWORD; echo
ADMIN_USERNAME=admin ADMIN_PASSWORD="$ADMIN_PASSWORD" pnpm setup
unset ADMIN_PASSWORD
```

建议立即在后台 `/admin/security` 开启 TOTP。可选：

```bash
pnpm seed:demo
```

完成后**必须退出应用用户 shell，回到有 sudo 权限的管理员 shell**，再执行 2.5 / 2.6：

```bash
exit
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

如果 Node 不在 `/usr/bin/node`，修改 service 中的 `ExecStart`。服务文件默认以 `eshi` 用户运行；`ProtectSystem=strict` 使 `/opt`、`/usr`、`/etc` 等系统目录只读，`ReadWritePaths=/var/lib/eshi-blog` 是唯一持久可写目录，`PrivateTmp=true` 提供临时目录。

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

以下命令需在目标机执行；首次部署请先验证镜像构建、初始化与健康检查。官方 Dockerfile 会把容器内监听地址设为 `0.0.0.0`，宿主机只发布 `127.0.0.1:3000`。

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

`HOST` 由 `docker-compose.yml` 设为 `0.0.0.0`，不需要写进 `.env`。

准备持久化目录并交给容器内 `node` 用户（UID 1000）：

```bash
mkdir -p data uploads backups
sudo chown -R 1000:1000 data uploads backups
```

### 3.2 构建、初始化与启动

```bash
docker compose build
docker compose run --rm blog pnpm setup
docker compose up -d
docker compose ps
docker compose logs -f --tail=100
```

`pnpm setup` 会交互式提示输入管理员用户名与密码（密码至少 10 位）。若必须非交互：

```bash
read -rsp '管理员密码（至少 10 位）: ' ADMIN_PASSWORD; echo
docker compose run --rm \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  blog pnpm setup
unset ADMIN_PASSWORD
```

不要把密码写进 compose 文件、`.env` 或 Git。

`docker-compose.yml` 只把 3000 端口绑定到 `127.0.0.1`，应继续使用宿主机 Nginx 反向代理：

```nginx
location / {
    client_max_body_size 3m;
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

### 3.5 恢复

先停止容器，恢复宿主机上的数据库与上传目录，再清理 WAL/SHM：

```bash
docker compose stop blog
cp backups/<时间戳>/blog.db data/blog.db
rm -f data/blog.db-wal data/blog.db-shm
rm -rf uploads
cp -a backups/<时间戳>/uploads uploads
sudo chown -R 1000:1000 data uploads
docker compose up -d
```

`.env`（至少 `APP_SECRET`）必须沿用原值，否则已开启的 TOTP 无法解密。恢复后检查健康状态与后台登录。

### 3.6 本地 HTTP 测试

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
- 平台容器内设置 `HOST=0.0.0.0`，否则 Node 只监听回环地址，平台健康检查/路由无法访问；
- 不把 SQLite 放在临时文件系统；无状态 serverless 部署不适用；
- 首次启动后通过平台终端执行 `pnpm setup`；
- `pnpm setup` / `pnpm backup` 使用 `tsx` 等 devDependency。若平台在构建/初始化阶段裁剪生产依赖，`pnpm setup` 会失败；请为构建和初始化阶段安装 devDependencies，或直接使用官方 Dockerfile。

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

请将备份目录同步到另一台机器或对象存储，例如：

```bash
rsync -av /opt/eshi-blog/backups/ backup-host:/srv/backups/eshi-blog/
```

仅备份数据库不够：文章封面、站点 Icon 等上传文件也要一起备份。

此外，**备份目录不包含 `.env`**。请把 `APP_SECRET`（至少）单独存入密码管理器或加密的异地备份；更换 `APP_SECRET` 会使已开启的 TOTP 密钥永久无法解密。

crontab 示例（以 `eshi` 用户执行）：

```bash
# 先以 eshi 用户手动验证整条命令与 pnpm 的绝对路径：
cd /opt/eshi-blog
command -v pnpm
pnpm backup
```

假设 `command -v pnpm` 输出 `/usr/local/bin/pnpm`，使用：

```cron
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
0 3 * * * cd /opt/eshi-blog && /usr/local/bin/pnpm backup >> /home/eshi/eshi-backup.log 2>&1
```

> 不要把日志重定向到普通用户不可写的 `/var/log`；`pnpm` 路径按 `command -v pnpm` 的实际结果替换。配置后第二天检查日志与备份目录，确认 cron 真的执行过。

### 5.2 恢复

```bash
sudo systemctl stop eshi-blog
cd /opt/eshi-blog

# 先保留现场
sudo cp /var/lib/eshi-blog/data/blog.db /var/lib/eshi-blog/data/blog.db.before-restore-$(date +%s)

# 清理旧 WAL/SHM，避免与恢复的数据库不一致
sudo rm -f /var/lib/eshi-blog/data/blog.db-wal /var/lib/eshi-blog/data/blog.db-shm

# 恢复备份目录中的文件
sudo cp backups/<时间戳>/blog.db /var/lib/eshi-blog/data/blog.db
sudo rm -rf /var/lib/eshi-blog/uploads
sudo cp -a backups/<时间戳>/uploads /var/lib/eshi-blog/uploads
sudo chown -R eshi:eshi /var/lib/eshi-blog
sudo systemctl start eshi-blog
```

恢复时使用原来的 `.env`（尤其是 `APP_SECRET`）；如果换了新密钥，已开启的 TOTP 将无法解密。恢复后检查 `curl https://blog.example.com/api/health` 与后台登录。

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
6. localhost、`*.local` 以及常见私网 / 保留地址（127/10/172.16-31/192.168、169.254、100.64、0.0.0.0、IPv6 回环/ULA/link-local 等）会被后端拒绝推送，需先配置公网域名。
7. 发布新文章后再次推送。不要高频重复推送同一批 URL。

SEO 首屏元信息由 Node 在返回 `index.html` 时注入，客户端路由会继续更新 title / canonical / OG；`/admin`、404 页面会带 `noindex`。

---

## 7. 安全清单

- [ ] 使用 HTTPS，`COOKIE_SECURE=true`
- [ ] `APP_SECRET` 随机、≥32 字符、权限 600、不更换，并已独立安全备份
- [ ] 确认未使用任何示例或可猜测的管理员密码；项目不提供默认账号
- [ ] 开启 TOTP，并妥善保存验证器 / 恢复方式
- [ ] 不在公网暴露 SQLite 端口（本应用无数据库端口，仅文件）
- [ ] `data/`、`uploads/`、`backups/`、`.env` 权限最小化，不进入 Git
- [ ] Nginx 只代理 3000；`HOST=127.0.0.1` 或防火墙确保 Node 端口不直接暴露
- [ ] 定期更新 Node、pnpm、依赖与系统补丁
- [ ] 定期验证备份可恢复
- [ ] 不在仓库写入真实备案号之外的敏感信息
- [ ] 本项目无评论系统；不要通过第三方脚本重新引入评论嵌入

---

## 8. 故障排查

| 现象                       | 排查方向                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 登录/保存返回 403 CSRF     | 检查 `SITE_URL` / `ALLOWED_ORIGINS` 是否包含浏览器实际 Origin；确认请求带 `X-CSRF-Token`。`TRUST_PROXY` 只影响客户端 IP 与限流，不决定 CSRF Origin 校验 |
| 登录后仍然未登录           | HTTPS 下 `COOKIE_SECURE=true`；检查浏览器是否阻止第三方/安全 Cookie；确认没有多个域名混用                                                               |
| 登录 429                   | 登录失败限流生效：密码窗口 15 分钟，TOTP 窗口 10 分钟；等待窗口结束或检查数据库 `login_attempts`                                                        |
| TOTP 永远验证失败          | 服务器和手机时间需同步；检查 `APP_SECRET` 是否被更换                                                                                                    |
| 数据库 `SQLITE_BUSY`       | 确认只有一个实例在写；不要在容器副本间共享 DB；检查磁盘权限                                                                                             |
| 上传失败                   | 检查 `UPLOAD_DIR` 写权限、反向代理 `client_max_body_size`、图片是否 ≤2MB 且为支持的格式（不允许 SVG）                                                   |
| 播放器封面/音频被 CSP 拦截 | 当前 CSP 允许 `https:` 图片与媒体；HTTP 音频在 HTTPS 页面会被浏览器拦截；可配置自建 Meting API 使用 HTTPS                                               |
| 播放列表失败               | 后台检查 Meting API 地址、歌单是否公开、网络连通性；后台「预览」可先验证                                                                                |
| sitemap 含 localhost       | 在 `.env` 与后台站点设置中改为真实域名，重启/刷新                                                                                                       |
| 推送按钮禁用               | 域名不是公网地址或未配置 Key/Token                                                                                                                      |
| IndexNow Key 文件 404      | 确认 Key 已保存且访问地址是 `SITE_URL/<key>.txt`；反向代理不能拦截 `.txt`                                                                               |
| 页面加载后没有内容         | 查看 `/api/health`、Nginx 日志、浏览器控制台；检查前端构建产物是否存在                                                                                  |
| 静态资源 404               | 重新执行 `pnpm build`；确认 `client/dist` 存在且 Node 有读取权限                                                                                        |
| 修改样式后前台未更新       | 重新构建并部署；浏览器强刷；检查 Nginx/缓存策略                                                                                                         |

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
