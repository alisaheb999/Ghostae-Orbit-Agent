@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo        Ghostae Orbit Agent - Setup and Builder
echo ========================================================
echo.

set DOTNET_CMD=dotnet
where dotnet >nul 2>&1
if %ERRORLEVEL% neq 0 (
    if exist "%LOCALAPPDATA%\Microsoft\dotnet\dotnet.exe" (
        set "DOTNET_CMD=%LOCALAPPDATA%\Microsoft\dotnet\dotnet.exe"
    ) else if exist "%ProgramFiles%\dotnet\dotnet.exe" (
        set "DOTNET_CMD=%ProgramFiles%\dotnet\dotnet.exe"
    ) else (
        echo [ERROR] .NET SDK not found.
        echo Please ensure .NET 8 SDK is installed.
        pause
        exit /b 1
    )
)

echo [1/3] Building Orbit Agent...
"%DOTNET_CMD%" build src\Ghostae.Orbit.Agent\Ghostae.Orbit.Agent.csproj -c Release
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Build failed.
    pause
    exit /b 1
)

echo [2/3] Publishing Standalone Package...
"%DOTNET_CMD%" publish src\Ghostae.Orbit.Agent\Ghostae.Orbit.Agent.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o dist\standalone
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Standalone publish failed, falling back to standard publish...
    "%DOTNET_CMD%" publish src\Ghostae.Orbit.Agent\Ghostae.Orbit.Agent.csproj -c Release -o dist\GhostaeOrbitAgent
)

echo [3/3] Compiling Root Launcher (Orbit.exe)...
if exist "%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\csc.exe" (
    "%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /target:winexe /out:"Orbit.exe" "OrbitLauncher.cs" >nul 2>&1
)

echo.
echo ========================================================
echo   [SUCCESS] Setup Completed! You can now run Orbit.exe
echo ========================================================
echo.
pause
