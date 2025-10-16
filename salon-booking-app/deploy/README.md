Deployment helpers

Files:
- start-server.ps1 - PowerShell script to start the server (simple restart-on-failure loop). Edit the $ServerDir and $DatabaseUrl as needed.
- start-server.service.template - systemd unit template; adjust paths/env and copy to /etc/systemd/system for Linux.

Usage examples

PowerShell (Windows):
```powershell
# Run from repo root or any path
powershell -ExecutionPolicy Bypass -File .\deploy\start-server.ps1 -ServerDir 'D:\GitHub_Src\fullstack\salon-booking-app\release\server' -Port 4301 -DatabaseUrl 'file:../prisma/salonBookingApp.db'
```

Linux (systemd):
1. Copy `deploy/start-server.service.template` to `/etc/systemd/system/salon-booking-server.service` and edit ExecStart and Environment.
2. Reload systemd: sudo systemctl daemon-reload
3. Enable and start: sudo systemctl enable --now salon-booking-server

CI / Release notes
- Use `npm run build:all` at repo root to build all apps.
- Or run `npm --prefix salon-booking-app/server run build:prod` for just the salon app.
