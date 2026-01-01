# Environment Variables Template

## Production Environment Variables

Create `packages/frontend/.env.production` with these variables:

```env
# Option 1: Local backend (won't work on deployed Firebase site)
# Use this only for local testing of production build
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3002
VITE_VISION_SERVICE_URL=http://localhost:5001

# Option 2: Cloud backend (uncomment when backend is deployed)
# VITE_API_URL=https://your-backend-url.run.app/api
# VITE_WS_URL=wss://your-backend-url.run.app
# VITE_VISION_SERVICE_URL=https://your-vision-service-url.run.app
```

## Local Development

No `.env` file needed! The code has defaults:
- `VITE_API_URL` → `http://localhost:3001/api`
- `VITE_WS_URL` → `ws://localhost:3002`
- `VITE_VISION_SERVICE_URL` → `http://localhost:5000`

## How It Works

1. **Development (`npm run dev`):**
   - Uses defaults or `.env.local` if it exists
   - `.env.local` is gitignored (won't be committed)

2. **Production Build (`npm run build`):**
   - Uses `.env.production` if it exists
   - Environment variables are embedded at build time
   - Cannot be changed after deployment without rebuilding

3. **Deployed Site:**
   - Uses whatever was in `.env.production` when built
   - If backend is on localhost, connections will fail (expected)
   - UI will still load and show connection errors gracefully

## Important Notes

⚠️ **Environment variables are embedded at build time**  
You cannot change them after deployment. You must rebuild and redeploy.

⚠️ **Deployed frontend cannot reach localhost**  
If your backend is on `localhost:3001`, the deployed Firebase site cannot connect to it.

✅ **Frontend handles connection failures gracefully**  
The UI will show connection errors but won't crash.

