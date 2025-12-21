# Quick Git Sync Commands

**Run these commands in a NEW terminal window (after restarting to pick up PATH changes):**

```bash
# Navigate to project
cd C:\Users\kimba\OneDrive\Documents\Dixi

# 1. Fetch all branches
git fetch --all

# 2. Check current branch and list all branches
git branch -a
git status

# 3. Stage all changes
git add -A

# 4. Commit current changes (test suite)
git commit -m "Add comprehensive test suite - 84 test cases across 18 files"

# 5. Switch to main (or create if doesn't exist)
git checkout main || git checkout -b main

# 6. Pull latest main if it exists on remote
git pull origin main || echo "Main doesn't exist on remote yet"

# 7. Get list of other branches to merge
git branch --format='%(refname:short)' | findstr /V "main HEAD"

# 8. For each branch, merge it (replace <branch-name> with actual branch)
# Example: git merge local-cloud-exec-eedf3 --no-edit

# 9. Create development branch
git checkout -b development

# 10. Push main branch
git push origin main || git push -u origin main

# 11. Push development branch
git push -u origin development

# 12. Verify
git branch -a
git status
```

## One-Liner Script (Copy & Paste)

```bash
cd C:\Users\kimba\OneDrive\Documents\Dixi && git fetch --all && git add -A && git commit -m "Add comprehensive test suite" && git checkout main 2>$null || git checkout -b main && git checkout -b development && git push -u origin main && git push -u origin development
```

## What This Does

1. ✅ Fetches all remote branches
2. ✅ Stages all new test files
3. ✅ Commits test suite
4. ✅ Switches to main (creates if needed)
5. ✅ Creates development branch
6. ✅ Pushes both branches to remote

**Note:** You may need to manually merge other branches if they exist. Check with `git branch -a` first.

