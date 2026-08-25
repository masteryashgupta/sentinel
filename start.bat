@echo off
setlocal

echo ====================================
echo    SENTINEL LAUNCH SEQUENCE
echo ====================================
echo.

set "MISSING_ENV=0"

:: Check and create Frontend .env
if not exist "frontend\.env" (
    echo [INFO] Creating frontend\.env from template...
    copy "frontend\.env.example" "frontend\.env" >nul
    set "MISSING_ENV=1"
)

:: Check and create Backend .env
if not exist "backend\.env" (
    echo [INFO] Creating backend\.env from template...
    copy "backend\.env.example" "backend\.env" >nul
    set "MISSING_ENV=1"
)

:: Check and create ML-Service .env
if not exist "backend\ml-service\.env" (
    echo [INFO] Creating backend\ml-service\.env from template...
    copy "backend\ml-service\.env.example" "backend\ml-service\.env" >nul
    set "MISSING_ENV=1"
)

if "%MISSING_ENV%"=="1" (
    echo.
    echo ======================================================================
    echo [ACTION REQUIRED] New .env files were generated from templates.
    echo.
    echo Please open the following files in your editor and fill in your actual 
    echo API keys and secrets ^(Supabase, Google OAuth, Groq/Gemini, etc.^):
    echo - frontend\.env
    echo - backend\.env
    echo - backend\ml-service\.env
    echo.
    echo Once you have saved your values, close this window and run start.bat again.
    echo ======================================================================
    pause
    exit /b
)

echo [OK] All environment files verified.
echo.
echo Starting Sentinel Services in separate windows...
echo.

:: Start all services in a single Windows Terminal with tabs
echo - Launching services in Windows Terminal...
wt -w 0 nt --title "Sentinel Frontend" -d frontend cmd /k "npm run dev" ; nt --title "Sentinel Backend" -d backend cmd /k "npm run dev" ; nt --title "Sentinel ML Service" -d backend\ml-service cmd /k "if exist venv\Scripts\activate (call venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8000) else (echo [ERROR] Virtual environment not found. && pause)"

echo.
echo [SUCCESS] Sentinel is booting up in Windows Terminal!
echo - Frontend: http://localhost:5173
echo - Backend API: http://localhost:4000
echo - ML Service: http://localhost:8000
echo.
pause
