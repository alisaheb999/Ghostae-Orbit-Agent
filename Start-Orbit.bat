@echo off
title Ghostae Orbit Agent
cd /d "%~dp0"
if exist "Orbit.exe" (
    start "" "Orbit.exe" %*
) else if exist "dist\standalone\Ghostae.Orbit.Agent.exe" (
    start "" "dist\standalone\Ghostae.Orbit.Agent.exe" %*
) else if exist "dist\GhostaeOrbitAgent\Ghostae.Orbit.Agent.exe" (
    start "" "dist\GhostaeOrbitAgent\Ghostae.Orbit.Agent.exe" %*
) else (
    echo [ERROR] Orbit executable not found.
    pause
)
