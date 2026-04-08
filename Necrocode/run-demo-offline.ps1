$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$archivePath = Join-Path $PSScriptRoot "artifacts\necrocode-images.tar"
if (-not (Test-Path $archivePath)) {
  Write-Error "Не найден $archivePath"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error "Docker CLI не найден. Установите Docker Desktop."
}

docker info *> $null

if (-not (Test-Path ".env")) {
  if (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env"
  }
}

Write-Host "[1/3] Loading images from archive..."
docker load -i $archivePath

Write-Host "[2/3] Starting stack without rebuild..."
docker compose up -d --no-build

Write-Host "[3/3] Services:"
docker compose ps

Write-Host "\nOpen: http://localhost"
