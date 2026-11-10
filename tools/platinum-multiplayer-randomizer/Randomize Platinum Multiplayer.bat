@echo off
setlocal
title Pokemon Platinum Multiplayer - NuzTracker Randomizer
cd /d "%~dp0"

echo ==============================================================
echo   Pokemon Platinum Multiplayer (Project PM v0.4.7) randomizer
echo   NDS - Platinum Multiplayer hack only - powered by NuzTracker
echo ==============================================================
echo.
echo Settings: %~dp0settings.json
echo.

py -3.11 --version >nul 2>&1
if errorlevel 1 (
  echo ERROR: Python 3.11 is required ^(Project PM Setup is built with it^).
  echo Install it from https://www.python.org/downloads/release/python-3119/
  echo then run this file again.
  pause
  exit /b 1
)

py -3.11 "%~dp0lib\randomize.py" "%~dp0settings.json"
set EXIT_CODE=%ERRORLEVEL%
echo.
if %EXIT_CODE% neq 0 (
  echo Randomization failed. Your original ROM was not modified.
) else (
  echo Randomization complete.
)
pause
exit /b %EXIT_CODE%
