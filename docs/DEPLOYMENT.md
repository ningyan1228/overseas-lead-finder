# 部署说明

## 服务器准备

服务器需要 Node.js 20 或 Docker、Nginx 以及一个 HTTPS 域名，例如 `api.example.com`。将 `server/` 上传到 `/opt/lead-finder/server`，不要上传 `.env` 到 GitHub。

### Docker

```bash
cd /opt/lead-finder/server
cp .env.example .env
# 编辑 .env，填写 Notion、SerpApi、登录密码、JWT 和你的 GitHub Pages 域名
docker compose up -d --build
docker compose logs -f
```

### systemd（不使用 Docker）

```bash
cd /opt/lead-finder/server
npm install
npm run build
sudo cp lead-finder.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now lead-finder
sudo systemctl status lead-finder
```

`HOST=127.0.0.1` 是默认且应保留的安全配置；只允许 Nginx 在同机转发请求。

## Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name api.example.com;

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

验证：`curl https://api.example.com/api/health` 应返回 `{"ok":true,"version":"1.0.0"}`。

## GitHub Pages

将 `lead-finder/config.js` 的 `apiBaseUrl` 改为 `https://api.example.com/api`，提交后 GitHub Actions 会发布 `lead-finder/`。在仓库 Settings → Pages 中选择 **GitHub Actions** 作为来源。

同时把前端实际域名填入服务器 `.env` 的 `ALLOWED_ORIGINS`，例如：

```env
ALLOWED_ORIGINS=https://YOUR_GITHUB_USERNAME.github.io
```

不要使用 `*`，也不要把 Notion Token、SerpApi Key、管理员密码或 JWT Secret 放进 `lead-finder/`、GitHub Actions 前端变量或任何提交。

## WinSCP 上传建议

上传 `server/` 到 `/opt/lead-finder/server`，使用 SCP/SFTP；上传后在 SSH/VS Code 终端运行上述 Docker 或 systemd 命令。`.env` 在服务器上手工创建，权限建议设为 `chmod 600 .env`。
