#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  deploy.sh — Alchemist's Automatons
#  Commits all local changes and deploys to GitHub Pages.
#
#  Requirements: git, gh (GitHub CLI, logged in)
#  Usage:
#    ./deploy.sh                        # auto commit message
#    ./deploy.sh "feat: new feature"    # custom commit message
# ─────────────────────────────────────────────────────────────

set -e

REPO="victorinno/alch_auto"
BRANCH="main"
COMMIT_MSG="${1:-"deploy: update game $(date '+%Y-%m-%d %H:%M')"}"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║    Alchemist's Automatons — Deploy       ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 1. Sanity checks ──────────────────────────────────────────
if ! command -v git &>/dev/null; then
  echo "❌  git not found. Please install git."; exit 1
fi
if ! command -v gh &>/dev/null; then
  echo "❌  gh CLI not found. Install from https://cli.github.com/"; exit 1
fi
if ! gh auth status &>/dev/null; then
  echo "❌  Not logged in to GitHub CLI. Run: gh auth login"; exit 1
fi
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  echo "❌  Not inside a git repository."; exit 1
fi

# ── 2. Pull latest ────────────────────────────────────────────
echo "⬇️   [1/4] Pulling latest from origin/$BRANCH..."
git pull origin "$BRANCH" --rebase --quiet

# ── 3. Stage & commit ─────────────────────────────────────────
echo "📦  [2/4] Staging all changes..."
git add -A

if git diff --cached --quiet; then
  echo "      ℹ️  Nothing to commit — creating empty deploy commit to trigger Pages rebuild..."
  git commit --allow-empty -m "$COMMIT_MSG"
else
  echo "💾  [3/4] Committing: \"$COMMIT_MSG\""
  git commit -m "$COMMIT_MSG"
fi

# ── 4. Push ───────────────────────────────────────────────────
echo "🚀  [4/4] Pushing to GitHub..."
git push origin "$BRANCH"

# ── 5. Wait for Pages deploy ──────────────────────────────────
echo ""
echo "⏳  Waiting for GitHub Pages to deploy..."
DEPLOYED=false
for i in $(seq 1 12); do
  sleep 10
  STATUS=$(gh api "repos/$REPO/deployments" --jq '.[0].id' 2>/dev/null | \
           xargs -I{} gh api "repos/$REPO/deployments/{}/statuses" --jq '.[0].state' 2>/dev/null || echo "pending")
  COMMIT=$(gh api "repos/$REPO/deployments" --jq '.[0].sha[0:7]' 2>/dev/null || echo "?")
  echo "    [$((i*10))s] status: $STATUS (commit: $COMMIT)"
  if [ "$STATUS" = "success" ]; then
    DEPLOYED=true
    break
  fi
done

echo ""
if [ "$DEPLOYED" = true ]; then
  echo "✅  Deploy complete!"
else
  echo "⚠️   Deploy still in progress — check GitHub for status."
fi

echo ""
echo "🌐  https://victorinno.github.io/alch_auto/"
echo ""
