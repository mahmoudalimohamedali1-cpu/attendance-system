@echo off
setlocal enabledelayedexpansion
echo ========================================
echo    Safe Deploy - Attendance System
echo ========================================
echo.

set "GIT=C:\Program Files\Git\cmd\git.exe"

cd /d "C:\Users\Administrator\Downloads\attendance system\attendance-system\backend"

echo [1/5] Building locally to check for errors...
echo.
call npm run build 2>&1

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo    BUILD FAILED! Errors found.
    echo    Fix the errors before deploying.
    echo ========================================
    pause
    exit /b 1
)

echo.
echo [OK] Local build successful!
echo.

cd /d "C:\Users\Administrator\Downloads\attendance system\attendance-system"

echo [2/5] Adding all local changes...
"%GIT%" add -A

echo [3/5] Committing changes...
set timestamp=%date:~-4%%date:~3,2%%date:~0,2%-%time:~0,2%%time:~3,2%
set timestamp=%timestamp: =0%
"%GIT%" commit -m "deploy: sync local changes %timestamp%"

if %ERRORLEVEL% NEQ 0 (
    echo [INFO] No new changes to commit. Continuing...
)

echo [4/5] Pushing to GitHub...
"%GIT%" push origin main

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo    PUSH FAILED! Check GitHub credentials.
    echo ========================================
    pause
    exit /b 1
)

echo [5/5] Deploying on VPS...
ssh -i C:\Users\Administrator\.ssh\id_rsa root@72.61.239.170 "cd /var/www/attendance-system && git stash && git pull origin main && cd backend && npx prisma generate && npm run build && pm2 restart backend && echo '=== DEPLOY SUCCESS! ===' || echo '=== VPS BUILD FAILED ==='"

echo.
echo ========================================
echo    Deployment Complete!
echo ========================================
pause
