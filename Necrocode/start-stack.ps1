$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error "Docker CLI не найден. Установите Docker Desktop и повторите запуск."
}

cmd /c "docker info >nul 2>nul"
if ($LASTEXITCODE -ne 0) {
  Write-Error "Docker Desktop не запущен или недоступен. Запустите Docker Desktop и повторите попытку."
}

if (-not (Test-Path ".env")) {
  if (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env"
    Write-Host "Создан .env из .env.example"
  }
}

$webPort = "80"
if (Test-Path ".env") {
  $line = Get-Content ".env" | Where-Object { $_ -match '^WEB_PORT\s*=' } | Select-Object -First 1
  if ($line) {
    $webPort = ($line -split '=', 2)[1].Trim()
  }
}

Write-Host "[1/3] Stopping old local backend process on :8080 if exists..."
$conn = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
if ($conn) {
  try {
    Stop-Process -Id $conn.OwningProcess -Force
    Write-Host "Stopped process PID $($conn.OwningProcess) on :8080"
  } catch {
    Write-Host "Could not stop PID $($conn.OwningProcess), continuing..."
  }
}

$webConn = Get-NetTCPConnection -LocalPort ([int]$webPort) -State Listen -ErrorAction SilentlyContinue
if ($webConn) {
  Write-Error "Порт $webPort уже занят. Освободите его или поменяйте WEB_PORT в .env"
}

Write-Host "[2/3] Building and starting docker stack..."
docker compose up -d --build

Write-Host "[3/3] Current services:"
docker compose ps

Write-Host "\nNecrocode is running:"
Write-Host "- Frontend + Nginx: http://localhost:$webPort"
Write-Host "- API through Nginx: http://localhost/api/health"
