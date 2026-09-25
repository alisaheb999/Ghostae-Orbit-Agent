@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo        Ghostae Orbit Agent - Push to GitHub
echo ========================================================
echo.

set "GIT_EXE=C:\Program Files\Git\cmd\git.exe"
if not exist "%GIT_EXE%" set "GIT_EXE=git"

echo [1/3] Checking Git status...
"%GIT_EXE%" add -A
"%GIT_EXE%" commit -m "Ghostae Orbit Agent: Updates and GitHub Actions CI/CD" >nul 2>&1

echo [2/3] Setting remote origin...
"%GIT_EXE%" branch -M main
"%GIT_EXE%" remote remove origin >nul 2>&1
"%GIT_EXE%" remote add origin https://github.com/h9acker9999/Ghostae-Orbit-Agent.git

echo [3/3] Pushing to GitHub (origin/main)...
"%GIT_EXE%" push -u origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo   [SUCCESS] Code successfully pushed to GitHub!
    echo   Repo: https://github.com/h9acker9999/Ghostae-Orbit-Agent
    echo ========================================================
) else (
    echo.
    echo [ERROR] Push failed. If prompted, please complete the browser authentication.
)

echo.
pause
