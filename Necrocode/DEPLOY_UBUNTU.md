# Deploy on Ubuntu Server (Domain + HTTPS)

This guide is for:
- domain: `necrocode.ru` (and optionally `www.necrocode.ru`)
- server IPv4: `5.129.194.183`
- app path: this repository

## 1) DNS records

In your DNS panel, create:
- `A` record for `@` -> `5.129.194.183`
- `A` record for `www` -> `5.129.194.183` (optional)

Wait until DNS is propagated.

## 2) Prepare the server

SSH to server, then install required packages:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2 nginx certbot python3-certbot-nginx git ufw
sudo systemctl enable --now docker
```

## 3) Clone and configure project

```bash
git clone <YOUR_REPO_URL>
cd Necrocode/Necrocode
cp .env.example .env
```

Edit `.env` for production:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<STRONG_DB_PASSWORD>
POSTGRES_DB=necrocode

WEB_PORT=1081
CORS_ORIGIN=https://necrocode.ru
JWT_SECRET=<LONG_RANDOM_SECRET>
COOKIE_SECURE=true
```

Generate a random JWT secret example:

```bash
openssl rand -base64 48
```

## 4) Start containers

```bash
docker compose up -d --build
docker compose ps
```

At this point app should be reachable locally on server at `http://127.0.0.1:1081`.

## 5) Configure Nginx reverse proxy

Create file `/etc/nginx/sites-available/necrocode`:

```nginx
server {
    listen 80;
    server_name necrocode.ru www.necrocode.ru;

    location / {
        proxy_pass http://127.0.0.1:1081;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site and reload nginx:

```bash
sudo ln -sf /etc/nginx/sites-available/necrocode /etc/nginx/sites-enabled/necrocode
sudo nginx -t
sudo systemctl reload nginx
```

## 6) Open firewall ports

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

If your hosting provider has its own firewall/security group, also allow 80/443 there.

## 7) Enable HTTPS (Let's Encrypt)

```bash
sudo certbot --nginx -d necrocode.ru -d www.necrocode.ru --redirect
```

Certbot will update Nginx config and enable auto-renewal.

## 8) Verify

```bash
curl -I https://necrocode.ru
curl https://necrocode.ru/api/health
```

Expected health response:

```json
{"status":"ok"}
```

## 9) Operations

Update app after code changes:

```bash
cd Necrocode/Necrocode
git pull
docker compose up -d --build
```

View logs:

```bash
docker compose logs -f web
docker compose logs -f backend
```

Stop stack:

```bash
docker compose down
```
