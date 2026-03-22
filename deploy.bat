@echo off
REM ─────────────────────────────────────────────
REM  deploy.bat — Alchemist's Automatons
REM  Deploys local changes to GitHub Pages
REM  Usage: deploy.bat ["optional commit message"]
REM ─────────────────────────────────────────────

setlocal EnableDelayedExpansion

set BRANCH=main

REM Use provided commit message or generate one with date/time
if "%~1"=="" (
  for /f "tokens=1-3 delims=/" %%a in ("%date%") do set TODAY=%%c-%%b-%%a
  for /f "tokens=1-2 delims=:" %%a in ("%time%") do set NOW=%%a:%%b
  set COMMIT_MSG=deploy: update game !TODAY! !NOW!
) else (
  set COMMIT_MSG=%~1
)

echo.
echo ╔══════════════════════════════════════╗
echo ║   Alchemist's Automatons - Deploy    ║
echo ╚══════════════════════════════════════╝
echo.

REM 1. Check we are inside a git repo
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Not inside a git repository.
  echo         Run this script from the project root folder.
  pause
  exit /b 1
)

REM 2. Pull latest remote changes
echo [1/4] Pulling latest changes from origin/%BRANCH%...
git pull origin %BRANCH% --rebase
if errorlevel 1 (
  echo [ERROR] git pull failed. Fix conflicts and try again.
  pause
  exit /b 1
)

REM 3. Stage all changes
echo [2/4] Staging all changes...
git add -A

REM 4. Commit if there is something to commit
git diff --cached --quiet >nul 2>&1
if errorlevel 1 (
  echo [3/4] Committing: "%COMMIT_MSG%"
  git commit -m "%COMMIT_MSG%"
  if errorlevel 1 (
    echo [ERROR] git commit failed.
    pause
    exit /b 1
  )
) else (
  echo [3/4] Nothing new to commit - working tree is clean.
)

REM 5. Push to GitHub
echo [4/4] Pushing to origin/%BRANCH%...
git push origin %BRANCH%
if errorlevel 1 (
  echo [ERROR] git push failed. Check your credentials and try again.
  pause
  exit /b 1
)

echo.
echo [OK] Deploy complete!
echo      Your game will be live at:
echo      https://victorinno.github.io/alch_auto/
echo.
echo      (GitHub Pages usually updates within 1-2 minutes)
echo.
pause
