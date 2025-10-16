# Simple Windows PowerShell deployment/start script with restart-on-failure
# Usage: .\start-server.ps1 -ServerDir "d:\GitHub_Src\fullstack\salon-booking-app\release\server" -Port 4301
param(
  [string]$ServerDir = "d:\GitHub_Src\fullstack\salon-booking-app\release\server",
  [int]$Port = 4301,
  [string]$DatabaseUrl = "file:../prisma/salonBookingApp.db",
  [int]$RestartDelaySec = 5
)

Write-Host "Starting server from: $ServerDir on port $Port"
if (-not (Test-Path $ServerDir)) {
  Write-Error "ServerDir does not exist: $ServerDir"
  exit 1
}

Push-Location $ServerDir

while ($true) {
  try {
    Write-Host "Launching node dist/index.js"
    $env:PORT = [string]$Port
    $env:DATABASE_URL = $DatabaseUrl
    node dist/index.js
    $exitCode = $LASTEXITCODE
    Write-Host "Server process exited with code $exitCode"
  }
  catch {
    Write-Host "Server process crashed: $_"
  }
  Write-Host "Waiting $RestartDelaySec seconds before restart..."
  Start-Sleep -Seconds $RestartDelaySec
}

Pop-Location
