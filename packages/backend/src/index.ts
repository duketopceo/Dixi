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

// WebSocket server with error handling
let wss: Server;
let wsService: WebSocketService | null = null;

try {
  wss = new Server({ port: Number(WS_PORT) });
  wsService = new WebSocketService(wss);
  
  wss.on('error', (error: Error & { code?: string }) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`❌ Port ${WS_PORT} is already in use. Please:`);
      logger.error(`   1. Kill the process using port ${WS_PORT}:`);
      logger.error(`      Windows: netstat -ano | findstr :${WS_PORT} then taskkill /PID <pid> /F`);
      logger.error(`      PowerShell: Get-NetTCPConnection -LocalPort ${WS_PORT} | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }`);
      logger.error(`   2. Or set WS_PORT environment variable to use a different port`);
      logger.error(`   3. Or run: npm run kill-port ${WS_PORT}`);
      process.exit(1);
    } else {
      logger.error('WebSocket server error:', error);
    }
  });
  
  wss.on('listening', () => {
    logger.info(`✅ WebSocket server listening on port ${WS_PORT}`);
  });
} catch (error) {
  logger.error('Failed to create WebSocket server:', error);
  if ((error as Error & { code?: string }).code === 'EADDRINUSE') {
    logger.error(`Port ${WS_PORT} is already in use. See instructions above.`);
    process.exit(1);
  }
  throw error;
}

logger.info('🚀 Dixi Backend starting...');
logger.info(`📡 HTTP Server: http://localhost:${PORT}`);
logger.info(`🔌 WebSocket Server: ws://localhost:${WS_PORT}`);
logger.info(`🤖 AI Service: Ollama (${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'})`);

server.on('error', (error: Error & { code?: string }) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`❌ Port ${PORT} is already in use. Please:`);
    logger.error(`   1. Kill the process using port ${PORT}:`);
    logger.error(`      Windows: netstat -ano | findstr :${PORT} then taskkill /PID <pid> /F`);
    logger.error(`      PowerShell: Get-NetTCPConnection -LocalPort ${PORT} | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }`);
    logger.error(`   2. Or set PORT environment variable to use a different port`);
    logger.error(`   3. Or run: npm run kill-port ${PORT}`);
    process.exit(1);
  } else {
    logger.error('HTTP server error:', error);
    throw error;
  }
});

server.listen(PORT, () => {
  logger.info(`✅ Dixi Backend ready on port ${PORT}`);
});

// Graceful shutdown
const shutdown = () => {
  logger.info('Shutdown signal received: closing servers...');
  
  // Close WebSocket server
  if (wss) {
    wss.close(() => {
      logger.info('WebSocket server closed');
    });
  }
  
  // Close HTTP server
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { app, wss, wsService };
