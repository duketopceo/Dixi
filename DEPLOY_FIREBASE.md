# Firebase Deployment Guide

## Firebase Hosting - FREE TIER (Spark Plan)

✅ **No billing required** - Firebase Hosting is completely free on the Spark plan:
- 10 GB storage
- 360 MB/day transfer
- Custom domain support
- SSL certificates included

## Prerequisites

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Verify project**:
   ```bash
   firebase use dixi-vision
   ```

## Deployment Steps

### Option 1: Automated Script (Recommended)

```powershell
.\scripts\deploy_firebase_auto.ps1
```

### Option 2: Manual Steps

1. **Build the frontend**:
   ```bash
   cd packages/frontend
   npm install
   npm run build
   cd ../..
   ```

2. **Deploy to Firebase Hosting** (ONLY hosting, not functions):
   ```bash
   firebase deploy --only hosting --project dixi-vision
   ```
   
   ⚠️ **IMPORTANT:** Always use `--only hosting` flag. The backend is NOT a Firebase Function - it's an Express server that should be deployed to Cloud Run separately if needed.

   Or if Firebase CLI is not in PATH:
   ```bash
   npx firebase-tools deploy --only hosting --project dixi-vision
   ```

3. **Your site will be live at**:
   - https://dixi-vision.web.app
   - https://dixi-vision.firebaseapp.com

## Verify Billing Status

Firebase Hosting on Spark plan (free tier) does NOT require:
- ❌ Credit card
- ❌ Billing account
- ❌ Payment method

To verify you're on the free tier:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **dixi-vision**
3. Go to Settings → Usage and billing
4. Confirm "Spark Plan" is active (no billing)

## Alternative: Docker Deployment

For production deployment on a Mac Mini cluster or local server, see [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) for complete Docker setup instructions.

**Docker deployment benefits:**
- All services run in containers
- Easy scaling across multiple nodes
- Better resource management
- Production-ready configuration

## ⚠️ CRITICAL: Production Environment Variables

### The Problem
When deployed to Firebase, the frontend **cannot connect to localhost**. The deployed site will show the UI but won't be able to reach your local backend/vision services.

### Three Deployment Scenarios

#### Scenario A: Frontend on Firebase, Backend Local (Current Setup)
**Status:** ✅ Frontend deployed, ❌ Backend connections won't work  
**Use Case:** Showing UI to others, but only you can use it (backend on your machine)

**What happens:**
- Frontend loads and displays correctly
- All API calls fail (can't reach `localhost:3001`)
- Camera feed unavailable (can't reach `localhost:5000`)
- WebSocket connections fail (can't reach `localhost:3002`)
- UI shows connection errors gracefully

#### Scenario B: Docker Deployment (Mac Mini Cluster)
**Status:** ✅ Everything works on your cluster  
**Requirements:**
1. Docker installed on Mac Mini cluster
2. Follow [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)
3. Services communicate via Docker network
4. Frontend can be served via nginx or Firebase

#### Scenario C: Full Cloud Deployment (Future)
**Status:** ✅ Everything works for everyone  
**Requirements:**
1. Deploy backend to Cloud Run / Firebase Functions
2. Deploy vision service to Cloud Run
3. Update environment variables in `.env.production`

### Environment Variables Setup

Create `packages/frontend/.env.production`:

```env
# For local backend (won't work on deployed Firebase site)
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3002
VITE_VISION_SERVICE_URL=http://localhost:5000

# OR for cloud backend (uncomment when backend is deployed)
# VITE_API_URL=https://your-backend-url.run.app/api
# VITE_WS_URL=wss://your-backend-url.run.app
# VITE_VISION_SERVICE_URL=https://your-vision-service-url.run.app
```

**Development (local):**
- Uses defaults: `http://localhost:3001/api`, `ws://localhost:3002`, `http://localhost:5000`
- No `.env` file needed for local development

**Production Build:**
- Vite automatically uses `.env.production` when running `npm run build`
- Environment variables are embedded at build time
- Cannot be changed after deployment without rebuilding

### Current Status
✅ Frontend code already uses environment variables correctly  
✅ Defaults are set for local development  
⚠️ Production build will use localhost URLs (won't work on deployed site)  
📝 This is expected until backend services are cloud-deployed

## Troubleshooting

**Build fails:**
- Ensure all dependencies are installed: `npm install` in `packages/frontend`
- Check TypeScript errors: `npm run build` will show errors

**Deployment fails:**
- Verify Firebase login: `firebase login:list`
- Check project: `firebase use dixi-vision`
- Verify `packages/frontend/dist` exists after build

**Site not loading:**
- Check Firebase Console → Hosting for deployment status
- Verify build output in `packages/frontend/dist`
- Check browser console for errors

