$ErrorActionPreference = 'Stop'

$creds = @{ email = 'superadmin'; password = 'SuperAdmin123!' }
Write-Host "Logging in as $($creds.email)"
$login = Invoke-RestMethod -Uri 'http://127.0.0.1:4301/api/auth/login' -Method POST -Body ($creds | ConvertTo-Json -Compress) -ContentType 'application/json'
if (-not $login.token) { Write-Error 'LOGIN FAILED'; exit 1 }
$token = $login.token
Write-Host "Got token: $token"

$payload = @{ theme = 'purple-dark'; appTitle = 'Salon Pro Test'; tagline = 'Test tagline' }
Write-Host 'Posting settings...'
Invoke-RestMethod -Uri 'http://127.0.0.1:4301/api/settings' -Method POST -Headers @{ Authorization = "Bearer $token" } -Body ($payload | ConvertTo-Json -Compress) -ContentType 'application/json'
Start-Sleep -Milliseconds 200

Write-Host 'Fetching saved settings...'
$res = Invoke-RestMethod -Uri 'http://127.0.0.1:4301/api/settings' -Method GET -Headers @{ Authorization = "Bearer $token" }
Write-Host 'Result:'
$res | ConvertTo-Json -Compress
