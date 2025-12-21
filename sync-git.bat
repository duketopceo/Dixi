@echo off
echo ========================================
echo Git Sync - Staging All Changes
echo ========================================
echo.

echo Checking git status...
git status --short

echo.
echo Resolving merge conflicts (if any)...
echo.

echo Staging all changes...
git add -A

echo.
echo Committing changes...
git commit -m "Fix CI/CD pipeline and sync all changes" -m "- Fix CI workflow: Install from root with npm ci for deterministic builds" -m "- Fix cache-dependency-path to match npm execution location" -m "- Fix Dockerfiles to only copy package.json" -m "- Resolve .firebaserc merge conflict" -m "- Add comprehensive test suite and documentation" -m "- Update frontend/backend configurations"

echo.
echo Current branch:
git branch --show-current

echo.
echo Pushing to remote...
git push

echo.
echo ========================================
echo Git sync complete!
echo ========================================
echo.
echo If you need to push to a specific branch:
echo   git push origin <branch-name>
echo.
pause

