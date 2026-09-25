@echo off
set "GIT_EXE=C:\Program Files\Git\cmd\git.exe"
if not exist "%GIT_EXE%" set "GIT_EXE=git"

"%GIT_EXE%" init
"%GIT_EXE%" config user.name "Ghostae Developer"
"%GIT_EXE%" config user.email "dev@ghostae.com"
"%GIT_EXE%" branch -M main
"%GIT_EXE%" remote remove origin >nul 2>&1
"%GIT_EXE%" remote add origin https://github.com/h9acker9999/Ghostae-Orbit-Agent.git
"%GIT_EXE%" add -A
"%GIT_EXE%" commit -m "Initial commit: Ghostae Orbit Agent with secure allowlist, modern UI, and GitHub Actions CI/CD"
echo --- GIT STATUS ---
"%GIT_EXE%" status
