@echo off
cd /d "%~dp0"
title Diligent in Law - Advocate Workstation
echo Starting Diligent in Law Workstation Server on port 8080...
start "" /B python sync_server.py
timeout /t 2 /nobreak >nul
start "" "http://localhost:8080"
echo Workstation is running at http://localhost:8080

