# 部署说明

## 服务器准备

服务器需要 Docker、已有的 nginx-proxy/acme-companion 网关以及 HTTPS 域名。项目 API 使用 `lead-finder-api.gjsx.uno`，服务器目录为 `~/projects/lead-finder-api`。不要上传 `.env` 到 GitHub。

### Docker

```bash
cd ~/projects/lead-finder-api
cp .env.example .env
# 编辑 .env，填写 Notion、SerpApi、登录密码、JWT 和你的 GitHub Pages 域名
docker compose up -d --build
docker compose logs -f
```

### systemd（不使用 Docker）

```bash
cd ~/projects/lead-finder-api
npm install
npm run build
sudo cp lead-finder.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now lead-finder
sudo systemctl status lead-finder
```

Docker 容器内会由 Compose 显式设为 `HOST=0.0.0.0`，但端口只暴露给 Docker 的 `web` 网络，不会直接开放到公网。

## Nginx

```nginx
server {
    listen 443 ssl http2;
server_name lead-finder-api.gjsx.uno;

    # 配置由 Certbot 或你的证书管理方式提供的 ssl_certificate / ssl_certificate_key
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

本项目使用现有 nginx-proxy 自动发现容器和签发证书，不需要手工新增上面的 Nginx 配置。验证：`curl https://lead-finder-api.gjsx.uno/api/health` 应返回 `{"ok":true,"version":"1.0.0"}`。

## GitHub Pages

`lead-finder/config.js` 已配置为 `https://lead-finder-api.gjsx.uno/api`。提交后 GitHub Actions 会发布 `lead-finder/`。在仓库 Settings → Pages 中选择 **GitHub Actions** 作为来源。

同时把前端实际域名填入服务器 `.env` 的 `ALLOWED_ORIGINS`，例如：

```env
ALLOWED_ORIGINS=https://YOUR_GITHUB_USERNAME.github.io
```

不要使用 `*`，也不要把 Notion Token、SerpApi Key、管理员密码或 JWT Secret 放进 `lead-finder/`、GitHub Actions 前端变量或任何提交。

## WinSCP 上传建议

上传 `server/` 到 `~/projects/lead-finder-api`，使用 SCP/SFTP；上传后在 SSH/VS Code 终端运行上述 Docker 或 systemd 命令。`.env` 在服务器上手工创建，权限建议设为 `chmod 600 .env`。
