@echo off
echo ==========================================================
echo Starting Auto Software Development Team Platform...
echo ==========================================================

:: Prepend Node.js installation directory to PATH
set "PATH=C:\Program Files\nodejs\;%PATH%"

:: Navigate to root workspace
cd /d "%~dp0"

:: Start Backend Uvicorn Server in a new window
echo Launching FastAPI backend server on port 8000...
start "Auto Devs Backend" cmd /c "backend\venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000"

:: Start Frontend Next.js Server in a new window
echo Launching Next.js frontend server on port 3000...
start "Auto Devs Frontend" cmd /c "cd frontend && npm run dev"

echo.
echo Launch sequence completed!
echo - Frontend dev dashboard: http://localhost:3000
echo - Backend API services: http://localhost:8000
echo.
echo Press any key to close this launcher...
pause > nul
