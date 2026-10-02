# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Vision service no longer crashes on startup — removed a merge conflict marker (`<<<<<<< HEAD`) committed to `packages/vision/main.py` in merge `cf81dbd`
- Backend `tsc` build error: `server.listen(PORT, ...)` received `string | number`
- Circular dependency `index.ts` ↔ route modules crashed `app.use()` when a route file was imported first (tests importing routes directly); routes now resolve WebSocket via `services/wsService.ts` registry
- `docker-compose.yml` vision service: `VISION_SERVICE_PORT=5000` (matches EXPOSE/published port), merged duplicate `environment:` keys, added `BACKEND_URL` for in-network pushes, removed unconditional `runtime: nvidia`
- Frontend Docker image: `REACT_APP_BACKEND_URL` was dead config — replaced with `VITE_API_URL`/`VITE_WS_URL` build args
- CORS: `origin: '*'` + `credentials: true` is rejected by browsers — now reflects origin when `FRONTEND_URL` is unset
- Backend gesture routes repointed to live vision endpoints (`/gesture/projector`, `/tracking/start|stop`) after the `/gesture*` endpoints were removed upstream
- `.env.example` vision ports corrected to 5001, Ollama defaults aligned with code (`gemma3:4b`, `llava:7b`)

### Removed
- `torch`/`torchvision` from vision requirements (no imports; ~2 GB of dead weight)
- Orphaned root `src/logger.ts` (imported `pino`, which was never a dependency)

### Added
- `services/wsService.ts` — WebSocket service registry replacing `import { wsService } from '../index'`

### Changed
- CI: removed `|| echo` soft-fail escapes so lint/test steps actually gate; dropped unconfigured ESLint steps and the red legacy `vitest` run (tracked as follow-up)
- README/.env.example now document `gemma3:4b` + `llava:7b` model defaults

### Added
- AGENTS.md for AI-assisted development standards
- CHANGELOG.md following Keep a Changelog format
- .commitlintrc.json for conventional commit enforcement
- GitHub Actions release workflow for automated releases

## [1.0.0] - 2026-03-23

### Added
- Initial stable release
- Enterprise standards compliance (versioning, logging, CI/CD)
