@echo off
REM ─────────────────────────────────────────────────────────────
REM  deploy.bat — Alchemist's Automatons
REM  Commits all local changes and deploys to GitHub Pages.
REM
REM  Requirements: git, gh (GitHub CLI, logged in)
REM  Usage:
REM    deploy.bat                        (auto commit message)
REM    deploy.bat "feat: new feature"    (custom commit message)
REM ─────────────────────────────────────────────────────────────

setlocal EnableDelayedExpansion

set REPO=victorinno/alch_auto
set BRANCH=main

if "%~1"=="" (
  for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set DT=%%I
  set COMMIT_MSG=deploy: update game !DT:~0,4!-!DT:~4,2!-!DT:~6,2! !DT:~8,2!:!DT:~10,2!
) else (
  set COMMIT_MSG=%~1
)

echo.
echo ╔══════════════════════════════════════════╗
echo ║    Alchemist's Automatons - Deploy       ║
echo ╚══════════════════════════════════════════╝
echo.

REM ── 1. Sanity checks ─────────────────────────────────────────
where git >nul 2>&1
if errorlevel 1 ( echo [ERROR] git not found. Please install git. & pause & exit /b 1 )

where gh >nul 2>&1
if errorlevel 1 ( echo [ERROR] gh CLI not found. Install from https://cli.github.com/ & pause & exit /b 1 )

gh auth status >nul 2>&1
if errorlevel 1 ( echo [ERROR] Not logged in to GitHub CLI. Run: gh auth login & pause & exit /b 1 )

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 ( echo [ERROR] Not inside a git repository. & pause & exit /b 1 )

REM ── 2. Pull latest ───────────────────────────────────────────
echo [1/4] Pulling latest from origin/%BRANCH%...
git pull origin %BRANCH% --rebase --quiet
if errorlevel 1 ( echo [ERROR] git pull failed. Fix conflicts and try again. & pause & exit /b 1 )

REM ── 3. Stage changes ─────────────────────────────────────────
echo [2/4] Staging all changes...
git add -A

REM ── 4. Commit ────────────────────────────────────────────────
git diff --cached --quiet >nul 2>&1
if errorlevel 1 (
  echo [3/4] Committing: "%COMMIT_MSG%"
  git commit -m "%COMMIT_MSG%"
) else (
  echo [3/4] Nothing to commit - creating empty deploy commit to trigger Pages rebuild...
  git commit --allow-empty -m "%COMMIT_MSG%"
)
if errorlevel 1 ( echo [ERROR] git commit failed. & pause & exit /b 1 )

REM ── 5. Push ──────────────────────────────────────────────────
echo [4/4] Pushing to GitHub...
git push origin %BRANCH%
if errorlevel 1 ( echo [ERROR] git push failed. Check your credentials. & pause & exit /b 1 )

REM ── 6. Wait for Pages deploy ─────────────────────────────────
echo.
echo Waiting for GitHub Pages to deploy...
set DEPLOYED=false
set /a TRIES=0

:WAIT_LOOP
set /a TRIES+=1
if %TRIES% GTR 12 goto DONE
timeout /t 10 /nobreak >nul

for /f %%S in ('gh api repos/%REPO%/deployments --jq ".[0].id" 2^>nul') do set DEP_ID=%%S
for /f %%T in ('gh api repos/%REPO%/deployments/%DEP_ID%/statuses --jq ".[0].state" 2^>nul') do set STATUS=%%T

echo     [%TRIES%0s] status: %STATUS%
if "%STATUS%"=="success" ( set DEPLOYED=true & goto DONE )
goto WAIT_LOOP

:DONE
echo.
if "%DEPLOYED%"=="true" (
  echo [OK] Deploy complete!
) else (
  echo [!!] Deploy still in progress - check GitHub for status.
)
echo.
echo     https://victorinno.github.io/alch_auto/
echo.
pause
