# 海外潜在客户搜索系统（MVP）

本仓库包含一个可部署的静态管理前端和 Node.js/TypeScript API。数据持久化仅使用 Notion；服务器不会创建本地数据库、网页归档或 CSV 文件。

## 目录

```text
lead-finder/       GitHub Pages 静态前端
server/            Express API、任务 worker、Notion 数据层
.github/workflows/ GitHub Pages 发布工作流
docs/              Notion、服务器和部署说明
```

## MVP 已覆盖的链路

`产品 → 新建搜索任务 → 规则生成关键词 → SerpApi → 域名标准化/去重 → Notion Companies`

仅处理公开网页与公开商业联系信息。MVP 不抓取登录墙、验证码页面或 LinkedIn 私有内容；联系人深度提取和官网多页解析将在后续阶段扩展。

## 快速开始

1. 在 Notion 新建一个空白父页面，将 Integration 连接到该页面。
2. 在 `server/` 复制 `.env.example` 为 `.env`，填写 `NOTION_TOKEN`、`NOTION_PARENT_PAGE_ID`。
3. 安装依赖并创建 Notion 数据库：

   ```powershell
   cd server
   npm install
   npm run notion:setup
   ```

4. 将脚本输出的五个数据库 ID 写入 `.env`；设置 `ADMIN_PASSWORD`、`JWT_SECRET`、`ALLOWED_ORIGINS` 和 `SERPAPI_API_KEY`。
5. 启动 API：`npm run dev`。
6. 在 `lead-finder/config.js` 填入公开的 API 地址，打开 `lead-finder/index.html` 或发布到 GitHub Pages。

部署和安全细节请见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) 与 [docs/NOTION.md](docs/NOTION.md)。

