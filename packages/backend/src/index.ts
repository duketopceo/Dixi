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
import healthRoutes from './routes/health';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { WebSocketService } from './services/websocket';
import logger, { morganStream } from './utils/logger';

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
app.use(morgan('combined', { stream: morganStream }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Health check routes (no rate limiting)
app.use('/health', healthRoutes);

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

logger.info('🚀 Dixi Backend starting...');
logger.info(`📡 HTTP Server: http://localhost:${PORT}`);
logger.info(`🔌 WebSocket Server: ws://localhost:${WS_PORT}`);
logger.info(`🎮 GPU Acceleration: ${process.env.USE_GPU === 'true' ? 'Enabled' : 'Disabled'}`);

server.listen(PORT, () => {
  logger.info(`✅ Dixi Backend ready on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
  });
});

export { app, wss, wsService };
