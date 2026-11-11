# 饿师傅的技术札记

一个带有天依蓝视觉与极客气质的全栈个人博客：**Vue 3 + Node.js + SQLite**。

> 项目正在按里程碑构建中。完整使用与部署说明将在 v1.0.0 阶段补齐。

## 技术栈

- 前端：Vue 3 + TypeScript + Vite + Vue Router + Pinia
- 后端：Node.js + Express 5 + TypeScript
- 数据库：SQLite（better-sqlite3，版本化迁移）
- 主题：`#66CCFF` 天依蓝，浅色 / 深色 / 跟随系统
- 测试：Vitest + Supertest + Vue Test Utils

## 本地开发

```bash
pnpm install
cp .env.example .env   # Windows: Copy-Item .env.example .env
pnpm dev
```

- 前台：http://localhost:5173
- 后台：http://localhost:5173/admin
- API：http://localhost:3000

## 安全说明

后台密码使用 bcrypt 哈希存储，支持 TOTP 两步验证、CSRF 防护和登录限流。项目**不包含任何评论功能或评论接口**。

## 目录

```text
client/   Vue 3 前端（前台 + 管理后台）
server/   Express API 与 SQLite 数据层
docs/     部署与运维文档
data/     运行时数据库（不提交）
uploads/  上传文件（不提交）
```
