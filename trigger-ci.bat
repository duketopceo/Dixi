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
git commit -m "Fix CI/CD pipeline: Update cache paths and Dockerfile package.json handling" -m "- Fix backend/frontend test cache to use root package-lock.json" -m "- Change npm ci to npm install (works without lock files in subdirs)" -m "- Fix Dockerfiles to only copy package.json (not package*.json)" -m "- Resolves 'Some specified paths were not resolved' errors" -m "- Fixes Docker build failures"

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

