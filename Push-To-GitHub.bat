@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo        Ghostae Desktop - Push to GitHub CI/CD
echo ========================================================
echo.

set "GIT_EXE=C:\Program Files\Git\cmd\git.exe"
if not exist "%GIT_EXE%" set "GIT_EXE=git"

echo [1/3] Staging changes...
"%GIT_EXE%" add -A
"%GIT_EXE%" commit -m "Auto-update Ghostae Desktop and build configuration" >nul 2>&1

echo [2/3] Setting branch...
"%GIT_EXE%" branch -M main

echo [3/3] Pushing to GitHub...
"%GIT_EXE%" push -u origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo [SUCCESS] Code successfully pushed to GitHub!
) else (
    echo.
    echo [ERROR] Push failed. Please verify git remote origin or credentials.
)
echo.
pause
