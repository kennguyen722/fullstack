$nodes = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodes) {
  foreach ($n in $nodes) {
    Write-Host "Stopping node process ID: $($n.Id) Name: $($n.ProcessName)"
    try { Stop-Process -Id $n.Id -Force } catch { Write-Host "Failed to stop $($n.Id): $_" }
  }
} else { Write-Host "No node processes found." }
