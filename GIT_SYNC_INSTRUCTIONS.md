# Git Sync & Branch Merge Instructions

## Quick Run (If git is in PATH)

```powershell
.\scripts\sync-and-merge-branches.ps1
```

## Manual Steps (If git is not in PATH)

Open Git Bash or PowerShell where git is configured, then run:

### 1. Navigate to project
```bash
cd C:\Users\kimba\OneDrive\Documents\Dixi
```

### 2. Fetch latest from remote
```bash
git fetch --all
```

### 3. List all branches
```bash
git branch -a
```

### 4. Switch to main branch
```bash
git checkout main
```

If main doesn't exist:
```bash
git checkout -b main
```

### 5. Pull latest main (if it exists on remote)
```bash
git pull origin main
```

### 6. Stage all current changes
```bash
git add -A
git status
```

### 7. Commit current changes
```bash
git commit -m "Add comprehensive test suite and merge all branches"
```

### 8. Merge other branches into main

For each branch (except main), merge it:
```bash
# Example: if you have a branch called "local-cloud-exec-eedf3"
git merge local-cloud-exec-eedf3 --no-edit

# Or merge all at once (if no conflicts)
git merge --no-edit $(git branch --format='%(refname:short)' | grep -v main | grep -v HEAD)
```

### 9. Create development branch from main
```bash
git checkout -b development
```

If development already exists:
```bash
git checkout development
git merge main --no-edit
```

### 10. Push main branch
```bash
git push origin main
```

If main doesn't exist on remote:
```bash
git push -u origin main
```

### 11. Push development branch
```bash
git push -u origin development
```

### 12. Verify
```bash
git branch -a
git status
```

## Expected Result

After completion:
- ✅ All branches merged into `main`
- ✅ `development` branch created from `main`
- ✅ Both branches pushed to remote
- ✅ All test suite files committed

## Current Changes to Commit

The following new files should be committed:
- `tests/` directory (entire test suite)
- `playwright.config.ts`
- `scripts/test-nuclear.ps1`
- `scripts/sync-and-merge-branches.ps1`
- Updated `package.json` (test dependencies)
- Updated `packages/vision/requirements.txt` (pytest dependencies)
- `tests/README.md`
- `AI_to_Khan.md` (updated)
- `WORK_LOG.md` (updated)

## Troubleshooting

### Merge Conflicts
If you get merge conflicts:
1. Resolve conflicts manually
2. `git add <resolved-files>`
3. `git commit -m "Resolve merge conflicts"`

### Branch Doesn't Exist on Remote
If pushing fails:
```bash
git push -u origin <branch-name>
```

### Can't Switch Branches
If you have uncommitted changes:
```bash
git stash
git checkout main
git stash pop
```

