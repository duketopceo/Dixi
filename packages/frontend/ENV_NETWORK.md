# Network Configuration for Windows Host Device

The frontend is configured to connect to services on the Windows host device at IP: **10.100.0.2**

## Environment Variables

Create a `.env.local` file in `packages/frontend/` with:

```
VITE_API_URL=http://10.100.0.2:3001/api
VITE_WS_URL=ws://10.100.0.2:3002
VITE_VISION_SERVICE_URL=http://10.100.0.2:5000
```

## Access URLs

- **Frontend**: http://10.100.0.2:3000 (or http://localhost:3000 on the Windows machine)
- **Backend API**: http://10.100.0.2:3001
- **WebSocket**: ws://10.100.0.2:3002
- **Vision Service**: http://10.100.0.2:5000

## For Projector Display

1. Open http://10.100.0.2:3000 in a browser on the Windows machine
2. Extend display to HDMI/projector
3. The browser window will appear on the projector


