@echo off
title Nexus AI Frontend (:3000)
echo Starting Nexus AI Frontend on port 3000...
cd /d "%~dp0frontend"
npm.cmd run dev
pause
