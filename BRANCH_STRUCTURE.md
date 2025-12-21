# Branch Structure and Merge Documentation

## Overview

This document describes the branch structure for the Dixi project and documents the branch merge operations completed on December 21, 2025.

## Current Branch Structure

### Primary Branches

#### `main`
- **Purpose**: Production-ready code
- **Protection**: Protected branch, requires PR reviews
- **Deployment**: Automatically deployed to production environments
- **Stability**: Must always be in a deployable state

#### `development`
- **Purpose**: Integration branch for ongoing development
- **Protection**: Recommended to protect and require reviews
- **Testing**: Continuous integration testing occurs here
- **Merges**: Feature branches merge here first before going to `main`

### Feature Branches

Feature branches should follow this naming convention:
- `feature/` - New features
- `fix/` - Bug fixes
- `chore/` - Maintenance tasks
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or updates

Examples:
```
feature/multi-hand-detection
fix/websocket-reconnect
chore/update-dependencies
docs/api-improvements
refactor/gesture-recognition
test/integration-tests
```

## Branch Merge History

### December 21, 2025: Branch Consolidation

#### Context
Prior to this merge, the repository had the following branches:
- `main` - The primary production branch at commit `187080a`
- `copilot/complete-api-documentation` - A branch with documentation and feature updates
- `copilot/merge-branches-into-main` - A working branch for the merge operation

#### Analysis Performed
1. Verified that `main` branch contained the most complete and up-to-date codebase
2. Confirmed `copilot/complete-api-documentation` had no unique files or changes that weren't already in `main`
3. The `copilot/complete-api-documentation` branch represented an older state of the project history

#### Actions Taken
1. ✅ Confirmed `copilot/merge-branches-into-main` already contained all commits from `main`
2. ✅ Verified no unique content existed in `copilot/complete-api-documentation` that needed preservation
3. ✅ Created new `development` branch from the merged state
4. ✅ Updated `CONTRIBUTING.md` with branch structure documentation

#### Results
- All branch content successfully consolidated
- New `development` branch created for ongoing work
- Branch structure documented for future contributors
- No code loss or regression from the merge

## Workflow

### For Contributors

1. **Starting New Work**
   ```bash
   git checkout development
   git pull origin development
   git checkout -b feature/your-feature-name
   ```

2. **During Development**
   ```bash
   git add .
   git commit -m "feat: description of changes"
   git push origin feature/your-feature-name
   ```

3. **Creating Pull Request**
   - Target branch: `development`
   - Ensure all tests pass
   - Request review from maintainers

4. **After PR Merge**
   ```bash
   git checkout development
   git pull origin development
   git branch -d feature/your-feature-name
   ```

### For Maintainers

#### Merging to Development
```bash
# Review and test the feature branch
git checkout feature/feature-name
npm test  # or appropriate test command

# Merge to development
git checkout development
git merge --no-ff feature/feature-name -m "Merge feature: description"
git push origin development
```

#### Releasing to Main
```bash
# Ensure development is stable and tested
git checkout main
git merge --no-ff development -m "Release: version x.y.z"
git tag -a vx.y.z -m "Version x.y.z"
git push origin main --tags
```

## Branch Protection Recommendations

### Main Branch
- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ✅ Include administrators in restrictions
- ✅ Require linear history

### Development Branch
- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass before merging
- ⚠️ Allow fast-forward merges for flexibility
- ℹ️ More lenient than main, but still protected

## Continuous Integration

### On Feature Branches
- Run unit tests
- Run linting
- Check code formatting
- Run security scans

### On Development Branch
- All feature branch checks
- Integration tests
- Performance tests
- Build verification

### On Main Branch
- All development branch checks
- Deployment to staging
- Smoke tests
- Documentation builds

## Troubleshooting

### Merge Conflicts

When you encounter merge conflicts:

```bash
# 1. Update your feature branch with latest development
git checkout feature/your-feature
git fetch origin
git merge origin/development

# 2. Resolve conflicts in your editor
# Edit conflicted files, remove conflict markers

# 3. Mark as resolved and continue
git add .
git commit -m "Merge development into feature/your-feature"
git push origin feature/your-feature
```

### Syncing a Stale Branch

```bash
# Update your local development branch
git checkout development
git pull origin development

# Rebase your feature branch on latest development
git checkout feature/your-feature
git rebase development

# Force push (only for your own branches!)
git push origin feature/your-feature --force-with-lease
```

## Best Practices

1. **Keep Branches Small**: Merge frequently, keep feature branches focused
2. **Update Regularly**: Sync with development branch daily
3. **Test Before PR**: Run all tests locally before creating PR
4. **Descriptive Names**: Use clear, descriptive branch names
5. **Clean Commit History**: Squash commits if needed before merging
6. **Delete Merged Branches**: Clean up after successful merges

## Related Documentation

- [CONTRIBUTING.md](./CONTRIBUTING.md) - General contribution guidelines
- [README.md](./README.md) - Project overview and setup
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment procedures
- [QUICKSTART.md](./QUICKSTART.md) - Getting started guide

---

*Last updated: 2025-12-21*
*Next review: When making significant changes to branch strategy*
