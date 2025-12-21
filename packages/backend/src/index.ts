import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { Server } from 'ws';
import { createServer } from 'http';
import gestureRoutes from './routes/gesture';
import aiRoutes from './routes/ai';
import projectionRoutes from './routes/projection';
import { errorHandler } from './middleware/errorHandler';
import { WebSocketService } from './services/websocket';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      backend: 'running',
      gpu: process.env.USE_GPU === 'true' ? 'enabled' : 'disabled'
    }
  });
});

// API Routes
app.use('/api/gestures', gestureRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/projection', projectionRoutes);

// Error handling
app.use(errorHandler);

// Create HTTP server
const server = createServer(app);

// WebSocket server
const wss = new Server({ port: Number(WS_PORT) });
const wsService = new WebSocketService(wss);

console.log(`🚀 Dixi Backend starting...`);
console.log(`📡 HTTP Server: http://localhost:${PORT}`);
console.log(`🔌 WebSocket Server: ws://localhost:${WS_PORT}`);
console.log(`🎮 GPU Acceleration: ${process.env.USE_GPU === 'true' ? 'Enabled' : 'Disabled'}`);

server.listen(PORT, () => {
  console.log(`✅ Dixi Backend ready on port ${PORT}`);
});

export { app, wss, wsService };
