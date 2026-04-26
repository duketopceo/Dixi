# Dixi — Agent Instructions

## Gospel Rules

**READ FIRST**: All agents and contributors must follow [luke-agents](https://github.com/duketopceo/luke-agents) — Karpathy principles, code standards, testing, security, guardrails, integrations, and deployment patterns. That repo is the source of truth.

**Precedence**:
1. `luke-agents` (gospel)
2. This `CLAUDE.md` (repo-specific overrides)
3. Runtime agent instructions

---

## Repo Context
AI-powered interactive projection system — computer vision, gesture recognition, real-time AI.

- Python backend + React frontend
- Runs locally (not cloud-deployed)
- CV models: version-pin all model weights
