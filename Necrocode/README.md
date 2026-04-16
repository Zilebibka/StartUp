# Necrocode Stack (Docker + Nginx)

## Что входит

- `db` - PostgreSQL 16
- `backend` - Go API
- `web` - React frontend в Nginx
- Nginx проксирует `/api/*` в backend (`http://backend:8080` внутри compose-сети)

Этот вариант подходит для запуска на другом ПК без установки Go/Node.js.

## Быстрый старт (для защиты, онлайн)

Требование: установлен Docker Desktop.

В папке `StartUp/Necrocode`:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-stack.ps1
```

Открыть:

- `http://localhost` - фронтенд
- `http://localhost/api/health` - health API

Остановить:

```powershell
powershell -ExecutionPolicy Bypass -File .\stop-stack.ps1
```

## Запуск на другом ПК без интернета (офлайн-демо)

На вашем ПК заранее подготовить архив образов:

```powershell
powershell -ExecutionPolicy Bypass -File .\prepare-demo-offline.ps1
```

Скопировать на другой ПК:

- всю папку `StartUp/Necrocode`
- файл `artifacts/necrocode-images.tar`

На другом ПК (с Docker Desktop):

```powershell
powershell -ExecutionPolicy Bypass -File .\run-demo-offline.ps1
```

## Настройки

Используется файл `.env` (если отсутствует, создается из `.env.example`).

Основные параметры:

- `WEB_PORT` - порт фронтенда (по умолчанию `80`)
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `CORS_ORIGIN`

Для развертывания на Linux-сервере с доменом и HTTPS см. `DEPLOY_UBUNTU.md`.

## Частые проблемы

- Порт занят: поменяйте `WEB_PORT` в `.env` или освободите порт.
- Docker не запущен: откройте Docker Desktop и дождитесь статуса Running.
- Старый локальный backend мешает: `start-stack.ps1` автоматически пытается остановить процесс на `:8080`.
