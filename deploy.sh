#!/usr/bin/env bash
# ─────────────────────────────────────────────
#  deploy.sh — Alchemist's Automatons
#  Deploys local changes to GitHub Pages
#  Usage: ./deploy.sh ["optional commit message"]
# ─────────────────────────────────────────────

set -e

BRANCH="main"
COMMIT_MSG="${1:-"deploy: update game $(date '+%Y-%m-%d %H:%M')"}"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   Alchemist's Automatons — Deploy    ║"
echo "╚══════════════════════════════════════╝"
echo ""

# 1. Check we are inside a git repo
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo "❌  Not inside a git repository. Run this script from the project root."
  exit 1
fi

# 2. Pull latest remote changes (avoid conflicts)
echo "⬇️   Pulling latest changes from origin/$BRANCH..."
git pull origin "$BRANCH" --rebase

# 3. Stage all changes
echo "📦  Staging all changes..."
git add -A

# 4. Commit only if there is something to commit
if git diff --cached --quiet; then
  echo "✅  Nothing new to commit — working tree is clean."
else
  echo "💾  Committing: \"$COMMIT_MSG\""
  git commit -m "$COMMIT_MSG"
fi

# 5. Push to GitHub → triggers GitHub Pages rebuild
echo "🚀  Pushing to origin/$BRANCH..."
git push origin "$BRANCH"

echo ""
echo "✅  Deploy complete!"
echo "🌐  Your game will be live at:"
echo "    https://victorinno.github.io/alch_auto/"
echo ""
echo "    (GitHub Pages usually updates within 1-2 minutes)"
echo ""
