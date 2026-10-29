# Smart Trader - Backend Startup Script
# Windows PowerShell

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Smart Trader Backend..." -ForegroundColor Cyan
Write-Host ""

# Get project/backend directories
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $ProjectRoot "backend"
$VenvDir = Join-Path $BackendDir "venv"
$Python = Join-Path $VenvDir "Scripts\python.exe"
$Requirements = Join-Path $BackendDir "requirements.txt"

# Move to backend directory
Set-Location $BackendDir

# Create virtual environment if it doesn't exist
if (-not (Test-Path $Python)) {
    Write-Host "📦 Creating Python 3.11 virtual environment..." -ForegroundColor Yellow

    py -3.11 -m venv $VenvDir

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create Python virtual environment."
    }
}

# Install dependencies if requested
if (Test-Path $Requirements) {
    Write-Host "📥 Checking backend dependencies..." -ForegroundColor Yellow

    & $Python -m pip install --use-feature=truststore -r $Requirements --disable-pip-version-check

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install backend dependencies."
    }
}

# app.config reads FINNHUB_API_KEY from the environment or backend .env.
# Do not store API keys in this script.

Write-Host ""
Write-Host "✨ Starting FastAPI server..." -ForegroundColor Green
Write-Host "🌐 API:  http://localhost:8000"
Write-Host "📚 Docs: http://localhost:8000/docs"
Write-Host ""
Write-Host "Press Ctrl+C to stop"
Write-Host ""

# Start FastAPI
& $Python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

