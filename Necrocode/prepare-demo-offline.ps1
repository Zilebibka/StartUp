$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error "Docker CLI не найден. Установите Docker Desktop."
}

docker info *> $null

if (-not (Test-Path ".env")) {
  if (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env"
  }
}

Write-Host "[1/4] Pulling postgres image..."
docker pull postgres:16

Write-Host "[2/4] Building project images..."
docker compose build

$artifactDir = Join-Path $PSScriptRoot "artifacts"
New-Item -ItemType Directory -Path $artifactDir -Force | Out-Null
$archivePath = Join-Path $artifactDir "necrocode-images.tar"

Write-Host "[3/4] Saving images to $archivePath ..."
docker save -o $archivePath postgres:16 necrocode-backend:latest necrocode-web:latest

Write-Host "[4/4] Done."
Write-Host "Copy this project folder + artifacts/necrocode-images.tar to another PC."
