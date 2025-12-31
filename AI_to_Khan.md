# AI_to_Khan - Status Update

**Last Updated:** December 30, 2025

## Latest: Gemini Integration & Repo Cleanup
- Gemini API configured (gemini-2.0-flash) - quota exhausted today, falls back to Ollama
- Fixed dotenv loading order (env vars now load before AI service imports)
- Removed 18 old PowerShell scripts, streamlined to bash-only
- New `start-dev.sh` and `stop-all.sh` scripts working perfectly
- All services running: Frontend :3000, Backend :3001, Vision :5001
