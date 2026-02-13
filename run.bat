@echo off
title Grace Planner Dev Server
cd /d "%~dp0"
echo [Grace Planner] Starting local server at http://localhost:3000...
echo.
echo If this is your first time, it might take a moment to download 'serve'.
echo.
npm start
if %errorlevel% neq 0 (
    echo.
    echo Error: Failed to start the server. 
    echo Please make sure Node.js and npm are installed.
    pause
)
pause
