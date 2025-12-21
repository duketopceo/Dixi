@echo off
echo ========================================
echo Triggering CI/CD Workflows
echo ========================================
echo.

echo Staging CI/CD fixes...
git add .github/workflows/ci.yml
git add packages/backend/Dockerfile
git add packages/frontend/Dockerfile

echo.
echo Committing changes...
git commit -m "Fix CI/CD pipeline: Install from root with npm ci for deterministic builds" -m "- Fix cache-dependency-path to match npm execution location (root)" -m "- Use npm ci from workspace root for reproducible builds" -m "- Fix Dockerfiles to only copy package.json" -m "- Resolves 'Some specified paths were not resolved' errors" -m "- Fixes Docker build failures"

echo.
echo Pushing to trigger CI/CD...
git push origin main

echo.
echo ========================================
echo Changes pushed! CI/CD workflows should start automatically.
echo Check status at: https://github.com/duketopceo/Dixi/actions
echo ========================================
echo.
pause

