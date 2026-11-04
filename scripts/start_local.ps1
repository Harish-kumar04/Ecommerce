# Start all Infalette local services (API, Storefront, Seller Admin, Platform Admin)
$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

Write-Host "==> Seeding local SQLite database (test_local.db)..." -ForegroundColor Cyan
$env:INFALETTE_ENV_FILE = "NUL"
Remove-Item Env:DATABASE_URL_POOLED -ErrorAction SilentlyContinue
Remove-Item Env:DATABASE_URL_DIRECT -ErrorAction SilentlyContinue
$env:DATABASE_URL = "sqlite+aiosqlite:///./test_local.db"
$env:DEBUG = "false"
$env:RATE_LIMIT_FAIL_CLOSED = "false"

& "$RepoRoot\.venv\Scripts\python.exe" "$RepoRoot\scripts\demo_seed.py"

Write-Host "==> Starting FastAPI Backend on http://localhost:8000 ..." -ForegroundColor Green
Start-Process -FilePath "$RepoRoot\.venv\Scripts\uvicorn.exe" -ArgumentList "apps.api.main:app --host 0.0.0.0 --port 8000" -WorkingDirectory $RepoRoot

Write-Host "==> Starting Storefront on http://localhost:3000/demo-store ..." -ForegroundColor Green
Start-Process -FilePath "node" -ArgumentList "node_modules/next/dist/bin/next start -p 3000" -WorkingDirectory "$RepoRoot\apps\storefront"

Write-Host "==> Starting Seller Admin on http://localhost:3001/login ..." -ForegroundColor Green
Start-Process -FilePath "node" -ArgumentList "node_modules/next/dist/bin/next start -p 3001" -WorkingDirectory "$RepoRoot\apps\admin"

Write-Host "==> Starting Platform Admin on http://localhost:3002/login ..." -ForegroundColor Green
Start-Process -FilePath "node" -ArgumentList "node_modules/next/dist/bin/next start -p 3002" -WorkingDirectory "$RepoRoot\apps\platform-admin"

Write-Host ""
Write-Host "All services launched!" -ForegroundColor Yellow
Write-Host "  Storefront     : http://localhost:3000/demo-store"
Write-Host "  Seller Admin   : http://localhost:3001/login   (owner@demo.test / demo1234)"
Write-Host "  Platform Admin : http://localhost:3002/login   (admin@infalette.com / admin1234)"
Write-Host "  API Swagger UI : http://localhost:8000/api/v1/docs"
