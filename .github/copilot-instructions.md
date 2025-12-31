# Dixi Project - Copilot Instructions

This file provides comprehensive guidelines for AI coding assistants working on the Dixi project. All AI tools—GitHub Copilot, Cursor, Claude, and any future assistants—MUST follow these rules without exception.

---

## Core Philosophy

Dixi is a production-quality codebase for a gesture-controlled podcast experience. Every feature must be built with the mindset of shipping to real users. We value **honesty over illusion**—a blank screen with a "Coming Soon" label is infinitely better than simulated data that misleads developers and testers.

---

## The Golden Rule: No Mock Data, No Fake Features

> **Fully implement or don't implement. There is no middle ground.**

### What This Means

1.  **Never generate placeholder data** that simulates real functionality. This includes:
    *   Random numbers pretending to be sensor readings.
    *   Hardcoded gesture types like `['point', 'swipe', 'pinch']` returned in a loop.
    *   Fake API responses that mimic a backend.
    *   Simulated camera feeds (e.g., solid color frames, pre-recorded videos presented as live).
    *   Mock user sessions, fake authentication tokens, or dummy user profiles.

2.  **If a feature cannot be fully implemented**, the AI assistant MUST:
    *   Clearly mark the feature as **"Under Development"** or **"Not Yet Implemented"** in the UI.
    *   Return an honest error or status message from the backend (e.g., `{"status": "not_implemented", "message": "This feature is under development."}`).
    *   Log the attempt for debugging purposes.
    *   **Never** silently fall back to fake data.

3.  **Why this matters:**
    *   Mock data hides bugs. If the camera fails, we need to know immediately—not see a fake feed that looks "fine."
    *   Fake features create false confidence. Developers may think a system works when it doesn't.
    *   It wastes debugging time. Hours can be lost chasing issues that stem from discovering the data was never real.

### Acceptable Alternatives to Mock Data

| Instead of...                     | Do this...                                                                 |
| --------------------------------- | -------------------------------------------------------------------------- |
| Fake gesture data                 | Display "No gesture detected" or "Waiting for hand..."                     |
| Simulated camera feed             | Show a clear error: "Camera unavailable" with troubleshooting steps.       |
| Placeholder API responses         | Return a proper HTTP error (e.g., 501 Not Implemented) with a clear message. |
| Hardcoded user data               | Require actual authentication or show "Login required."                    |

---

## Code Quality Standards

### General Principles

*   **Explicit over implicit.** Don't hide complexity behind magic. If something is configurable, expose it clearly.
*   **Fail fast with clear errors.** Validate inputs at boundaries. Surface actionable errors (what broke, why, and what to check).
*   **Small, focused functions.** Each function should do one thing well and be easy to test.
*   **Descriptive names.** Avoid cryptic abbreviations. `gesture_recognition_service` > `grs`. `hand_landmarks` > `hl`.

### Python Specifics

*   Use modern syntax: f-strings, type hints, dataclasses where appropriate.
*   Prefer `pytest` for all tests.
*   Use `logging` module instead of bare `print()` for production code. Debug prints are acceptable during development but should be annotated.

### TypeScript/JavaScript Specifics

*   Prefer explicit types and interfaces.
*   Use functional components and hooks in React.
*   Avoid `any` types unless absolutely necessary and documented.

### Error Handling

*   Catch specific exceptions, not bare `except Exception`.
*   Log errors with context (what operation failed, what inputs were provided).
*   Re-raise or return structured errors that the caller can act on.

---

## Testing Philosophy

### Every Feature Needs a Test

*   Before implementing a feature, consider how it will be tested.
*   Unit tests for core logic and data transformations.
*   Integration tests for API endpoints and service interactions.
*   Manual verification steps documented for UI/UX changes.

### Tests Must Not Use Mock Data for Core Assertions

*   If a test is verifying that the camera works, it must actually access the camera (or skip gracefully if unavailable).
*   If a test is verifying API responses, it should hit real endpoints—mocking is only acceptable for external third-party services to avoid rate limits or costs.

---

## UI/UX Standards

### Honest Interfaces

*   If data is loading, show a loading state.
*   If data failed to load, show an error state with a retry option.
*   If a feature is under development, show a clear banner or message.
*   Never show stale or cached data without indicating it.

### Modern Aesthetics

*   Follow the project's design system (dark mode, Inter font, GitHub-style color palette).
*   Use smooth transitions and micro-animations for feedback.
*   Ensure responsive layouts for different screen sizes.

---

## Documentation Standards

*   Every new file should have a header comment explaining its purpose.
*   Complex logic should have inline comments explaining the "why," not the "what."
*   Update `AI_to_Khan.md` after significant changes to summarize what was done.
*   API endpoints should be documented with expected inputs/outputs.

---

## Git and Version Control

*   Small, focused commits with clear messages.
*   Branch naming: `feature/...`, `fix/...`, `chore/...`.
*   Never commit mock data or placeholder implementations to `main`.
*   If work is in progress, use a feature branch and clearly label incomplete features in the code.
*   **Current workflow**: Work on `development` branch, merge to `main` when stable.
*   Never commit sensitive tokens or API keys (use environment variables).

## Architecture Notes (December 30, 2025)

### Service Ports
- Frontend: 3000 (or 5173 fallback)
- Backend API: 3001
- WebSocket: 3002
- Vision Service: 5001 (changed from 5000 due to macOS conflict)
- Ollama: 11434

### Vision Service
- Simplified to 10 core gestures for stability
- Removed complex motion patterns that caused freezes
- Port changed to 5001 (macOS ControlCenter uses 5000)

### Frontend Architecture
- Modular component structure (ControlPanel rebuilt)
- Singleton WebSocket pattern for connection stability
- Custom hooks for reusable logic (useSystemStatus, useDebugLogs)

### AI Service
- Dual model: gemma3:4b (text) + llava:7b (vision)
- Separate rate limiters for different operations
- Vision analysis endpoint: `/api/ai/vision/analyze`

### Testing
- Comprehensive AIService test suite (23 tests, all passing)
- Tests use real network calls (no mocks) for integration testing
- Run tests: `npm test` (default), `npm run test:ai`, `npm run test:ai:watch`
- Test files: `packages/backend/src/services/__tests__/*.test.ts`
- Tests gracefully skip when Ollama/Gemini unavailable

---

## When You Are Unsure

*   **Ask for clarification** rather than guessing.
*   If unsure which approach to take, list 2–3 options with pros/cons and recommend one.
*   Never silently guess at critical configurations (secrets, environment variables, service ports).

---

## Summary Checklist for AI Assistants

Before submitting any code, verify:

- [ ] No mock or fake data is being generated.
- [ ] Incomplete features are clearly marked as "Under Development."
- [ ] Error states are handled gracefully with honest messages.
- [ ] Code follows the project's style and quality standards.
- [ ] Tests do not rely on fake data for their core assertions.
- [ ] Documentation is updated if applicable.

---

*Last updated: 2025-12-31*
