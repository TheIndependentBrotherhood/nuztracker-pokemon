@echo off
rem One-shot shiny hunt launcher. Arguments are forwarded to the script,
rem e.g. shiny-hunt.bat --turn-ms 30 --min-hp 50
rem Without arguments, DEFAULT_ARGS is used.
set "DEFAULT_ARGS=--fast-forward --turn-ms 2"

set "ARGS=%*"
if not defined ARGS set "ARGS=%DEFAULT_ARGS%"

rem MelonDS runs as administrator, so key presses must come from an elevated process.
fltmc >nul 2>&1
if errorlevel 1 (
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -ArgumentList '%ARGS%' -Verb RunAs"
  exit /b
)

cd /d "%~dp0..\.."
title Shiny hunt
echo Options: %ARGS%
echo Focus the MelonDS window to start hunting. Ctrl+C to stop.
echo.
call yarn -s tsx tools/shiny-hunt/shiny-hunt.ts %ARGS%
echo.
pause